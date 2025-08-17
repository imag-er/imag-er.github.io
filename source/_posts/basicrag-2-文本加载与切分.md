---
title: basicrag 2 文本加载与切分
tags: [cloudwego, go, llm]
date: 2025-08-17 15:42:59
---

### 文本加载

loader部分比较简单, 不做过多解释
```go
// loader.go
func (e *RAGEngine) newLoader(ctx context.Context) {
	loader, err := file.NewFileLoader(ctx, &file.FileLoaderConfig{
		UseNameAsID: false, // 消息id后面指定
		Parser:      nil, // 不需要parse
	})
}
```
```go
// main.go
docs, err := engine.Loader.Load(ctx, document.Source{
    URI: "./testdata/README.md",
})
```

### 文本切分
也比较简单, 不做过多解释
```go
// splitter.go
func (e *RAGEngine) newSplitter(ctx context.Context) {
	splitter, err := markdown.NewHeaderSplitter(ctx, &markdown.HeaderConfig{
		Headers: map[string]string{
			"##": "title", // 按照##做split, 出来的结果字段为title
		},
	})
}
```

```go
// main.go
doc_split, err := engine.Splitter.Transform(ctx, docs)
for _, dd := range doc_split {
    dd.ID = uuid.New().String() // 对切分后的每一个section取id
    // fmt.Printf("Document ID: %s\nContent: %s\n==========\n", dd.ID, dd.Content)
}
```