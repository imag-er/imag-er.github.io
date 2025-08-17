---
title: basicrag 3 嵌入与检索
tags: [cloudwego, go, llm]
date: 2025-08-17 15:58:27
---

这部分的逻辑很清晰, 就是把前一步分割出来的若干文档向量化后存入数据库, 供后面步骤检索


### Embedding
embedding的作用是将上一部split出来的若干docs转化成向量,并逐个存入db, 这两步都由indexer实现.

做完embedding之后就需要把向量store进db  
存入db时的格式为 redis的hash结构
```
key: {prefix}{id}
value包含如下字段:
    _extension      // 文件拓展名
    _source         // 文件路径
    _file_name      // 文件名
    title           // 带有split符号的markdown标题, 这里是"## 1. 红黑树的定义"
    vector_content  // 向量化后的内容
    content         // 文本内容
```

```go
// main.go
_, err = engine.Indexer.Store(ctx, doc_split)
```

### Index
然后创建用于向量搜索的索引
```go
// indexer.go
createIndexArgs := []interface{}{
    "FT.CREATE", e.indexName,
    "ON", "HASH", // 索引的源数据类型为hash
    "PREFIX", "1", e.prefix, // 索引的数据key的前缀
    "SCHEMA",
        "content", "TEXT", // 查询的字段
        "vector_content", "VECTOR",  // vector字段
        "FLAT", // 扁平化搜索 (暴力搜索)
        "6", // 后面6个参数
        "TYPE", "FLOAT32", // 类型
        "DIM", e.dimension, // embedding模型输出的向量维数
        "DISTANCE_METRIC", "COSINE", // 距离算法
}
```

```go
// main.go
engine.InitVectorIndex(ctx)
```

这里需要注意的是最开始我的dimension和教程的不一样, 导致索引建立不成功, 后面就一直检索不到东西, 在这里卡了很久

### Retriever
这里定义了检索器的一些参数
```go
// retriever.go
func (e *RAGEngine) newRetriever(ctx context.Context) {
	retriever, err := redis.NewRetriever(ctx, &redis.RetrieverConfig{
		Client:            dal.Redis,
		Index:             e.indexName,
		VectorField:       "vector_content", // 指定向量字段
		DistanceThreshold: nil, // 向量距离阈值
		Dialect:           2,
		ReturnFields:      []string{"vector_content", "content"}, // 检索到结果后返回的字段, 后面要喂给llm的
		DocumentConverter: nil,
		TopK:              3, // 前k个结果
		Embedding:         e.Embedder,
	})
}
```

检索器会在后面用到