---
title: calcagent-ReAct编排的agent
tags: [llm,agent,go,cloudwego]
date: 2025-08-19 21:40:43
---


### 概述
本项目基于cloudwego/eino框架实现了一个基于[ReAct Orchestration](https://react-lm.github.io/)的Agent, 能够与大语言模型进行交互、并支持使用工具(加减乘除计算工具)来完成任务(四则运算求值)的逻辑。

### 目的
学习、演示ReAct Agent的工作流程, 演示对话history(多轮问答)


### 内容

ReAct Agent的工作流程如下:

1. 接收任务
   
2. 思考,生成思维链(COT,ChainOfThinking, 即思考完成任务需要的步骤1234...)
3. 行动(输出tool calling chunks, 调用工具)
4. 观察(查看是否完成任务)
5. 循环(若完成任务则结束, 未完成则继续 2.思考)
   
6. 输出答案

这个流程在eino的实现如下图

{% asset_img image.png "eino react agent workflow" %}


中间结果(模型思考、行动)的内容会被暂存在state里面, 直到检查到没有toolcall之后才会输出.
这里检查toolcall的行为在`react.AgentConfig`中有`StreamToolCallChecker`字段定义, 对于某些不在最开始输出toolcall的模型, 需要自定义这个checker.

### 工具定义

`tools/tools.go`里定义了加减乘除四个处理函数, 以及模型输入输出的类型约束

```go

type Formula struct {
	Operand1  int    `json:"Operand1" jsonschema:"required,description=the first operand"`
	Operand2  int    `json:"Operand2" jsonschema:"required,description=the second operand"`
	Operation string `json:"Operation" jsonschema:"required,enum=add,enum=sub,enum=mul,enum=div"`
}

type Result struct {
	Result int `json:"result"`
}

func AddService(ctx context.Context, form *Formula) (*Result, error) {
	logrus.Infof("%d %s %d = %d\n", form.Operand1, form.Operation, form.Operand2, form.Operand1+form.Operand2)
	return &Result{Result: form.Operand1 + form.Operand2}, nil
}

// sub mul div同理
```

### Agent定义

`agent/agent.go`定义了agent
这里也可以看到前面所说的自定义check, 检查是否有toolcall的chunks (有些模型不会把toolcall chunk放在最前面, 而是先输出一些content)
其余部分无需过多解释

```go
ins, err := react.NewAgent(a.ctx, &react.AgentConfig{
		ToolCallingModel: a.chatModel,
		ToolsConfig: compose.ToolsNodeConfig{
			Tools: tools.NewCalcTool(),
		},
		MessageModifier: func(ctx context.Context, input []*schema.Message) []*schema.Message {
			res := make([]*schema.Message, 0, len(input)+1)

			res = append(res, schema.SystemMessage(systemPrompt))
			res = append(res, input...)
			return res
		},
		// StreamToolCallChecker: func(ctx context.Context, sr *schema.StreamReader[*schema.Message]) (bool, error) {
		// 	defer sr.Close()
		// 	for {
		// 		msg, err := sr.Recv()
		// 		if err != nil {
		// 			if errors.Is(err, io.EOF) {
		// 				break
		// 			}
		// 			return false, err
		// 		}
		// 		if msg.Content != "" {
		// 			fmt.Printf("|->%v<-|", msg.Content)
		// 		}
		// 		if len(msg.ToolCalls) > 0 {
		// 			return true, nil
		// 		}
		// 	}
		// 	return false, nil
		// },
		MaxStep: 40,
	})
```


### 多轮对话
`main.go`里也实现了多轮对话

```go
historyMessages := make([]*schema.Message, 0)

for {
    var userinput string
    fmt.Printf("\nUser input : ")
    _, _ = fmt.Scan(&userinput)
    historyMessages = append(historyMessages, schema.UserMessage(userinput))
    // 流式输出
    sr, err := agent.Agent.Stream(ctx, historyMessages)

    modelOutputs := schema.Message{ Role: schema.Assistant }
    for {
        msg, err := sr.Recv()
        if err != nil {
            if errors.Is(err, io.EOF) {
                logrus.Infoln("EOF")
                break
            } else {
                logrus.Errorf("failed to receive message: %v", err)
            }
        }

        fmt.Print(msg.Content)
        modelOutputs.Content += msg.Content
    }

    historyMessages = append(historyMessages, &modelOutputs)
}
```