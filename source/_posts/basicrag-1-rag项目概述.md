---
title: basicrag 1 rag项目概述
tags: [cloudwego, go, llm]
date: 2025-08-16 20:49:07
---

项目地址: [github](https://github.com/imag-er/basicrag)
原教程地址: [bilibili](https://www.bilibili.com/video/BV1rcZrYiEfs)

### 什么是检索增强生成？
检索增强生成（RAG）是指对大型语言模型输出进行优化，使其能够在生成响应之前引用训练数据来源之外的权威知识库。大型语言模型（LLM）用海量数据进行训练，使用数十亿个参数为回答问题、翻译语言和完成句子等任务生成原始输出。在 LLM 本就强大的功能基础上，RAG 将其扩展为能访问特定领域或组织的内部知识库，所有这些都无需重新训练模型。这是一种经济高效地改进 LLM 输出的方法，让它在各种情境下都能保持相关性、准确性和实用性。

### 项目构成
这里只做简单介绍, 具体作用在后面介绍
| component | usage                               | input      | output     |
| --------- | ----------------------------------- | ---------- | ---------- |
| Loader    | 从文件加载文本                      | file       | string     |
| Splitter  | 分割文本                            | string     | \[\]string |
| Embedder  | 将文本embed成向量                   | \[\]string | \[dims]int |
| Indexer   | 将向量存入数据库, 建立向量搜索index | none       | none       |
| Retriever | 根据输入在数据库中检索              | string     | []string   |
| ChatModel | 与llm交互                           | string     | Stream     |


### quickstart
```
mv .env.example .env
# edit .env, fill with openai api key
docker compose up -d
go run .
```