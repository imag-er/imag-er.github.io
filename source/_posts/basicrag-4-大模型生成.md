---
title: basicrag 4 大模型生成
tags: [cloudwego, go, llm]
date: 2025-08-17 16:22:57
---
在前面我们实现了前面的知识库构建的步骤, 并定义好了检索器的接口, 接下来就需要利用起来


generate函数是这部分的核心, 接下来将介绍

这里定义了Prompt模版template, 并使用FString格式来格式化.
```go
template := prompt.FromMessages(schema.FString, []schema.MessagesTemplate{
    schema.SystemMessage(systemPrompt),
    schema.UserMessage("question: {content}"),
}...) 
```

FString引用了两个参数, `docuemnts`和`content`, `content`是用户的输入`query`, 我们使用`retriever`去先前建立的数据库中查找和`query`向量距离相近的相关文档, 
```go
docs, err := e.Retriever.Retrieve(ctx, query)
```
将其放入`documents`字段中,
```go
messages, err := template.Format(ctx, map[string]any{
    "documents": docs,
    "content":   query,
})
```
然后一起交给大模型, 生成回复并输出.
```go
var query string
for {
    fmt.Print("Enter your query >")
    _, _ = fmt.Scan(&query)
    s, err := engine.Generate(ctx, query)
    for {
        msg, err := s.Recv()
        if err != nil && errors.Is(err, io.EOF) {
            break
        }
        fmt.Printf("%s", msg.Content)
    }
}
```


ps. System Prompt
```go
// rag.go
var systemPrompt = `
# Role: Student Learning Assistant

# Language: Chinese

- When providing assistance:
  • Be clear and concise
  • Include practical examples when relevant
  • Reference documentation when helpful
  • Suggest improvements or next steps if applicable

here's documents searched for you:
==== doc start ====
	  {documents}
==== doc end ====
`
```

