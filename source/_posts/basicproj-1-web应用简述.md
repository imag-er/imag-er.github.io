---
title: basicproj 1 web应用简述
tags: [go,cloudwego]
date: 2025-08-15 14:22:04
---

### 1. 背景
最近在b站上看到了一个比较完整的go项目开发教程, 喝了两天时间看了一下, 跟着实现了项目, 原来希望能学到一些东西, 但是做下来发现太简单了, 也许比较适合新手入门, 于是这里就稍微记录一下比较关键的地方.

[B站视频链接](https://www.bilibili.com/video/BV1BY4UefEkM)

[github项目链接](https://github.com/imag-er/basicproj)

原视频更多是作为教学的性质, 复现的过程中把一些教学的东西去掉了.

# 2. 结构
原视频使用的是gin, 这里改成了cloudwego下的hertz, 其余技术栈没有改动.

项目目录大致如下, 后续几篇文章会对每个package做介绍
大致的功能可以见名知义, 不做过多介绍
```shell
.
├── config
│   ├── config.go
│   ├── dev.yaml
│   └── online.yaml
├── dal
│   ├── dal.go
│   ├── db.go
│   ├── models
│   └── redis.go
├── go.mod
├── go.sum
├── handlers
│   ├── article.go
│   ├── auth.go
│   └── likes.go
├── main.go
├── middleware
│   ├── cors.go
│   └── jwt.go
├── router
│   └── router.go
├── test
│   ├── create_article.sh
│   ├── get_article.sh
│   ├── likes.sh
│   ├── login.sh
│   ├── logout.sh
│   ├── ping.sh
│   └── register.sh
└── utils
    ├── logger.go
    └── utils.go
```

### 3.功能
项目实现了两个功能,以及关键技术点
1. 注册、登陆 (jwt orm)
2. 发布文章、获取文章、点赞文章 (api redis)

### 4.导航
[basicproj 1 web应用简述](https://imag-er.github.io/2025/08/15/basicproj-1-web%E5%BA%94%E7%94%A8%E7%AE%80%E8%BF%B0/)
[basicproj 2 config配置部分](https://imag-er.github.io/2025/08/15/basicproj-2-config%E9%85%8D%E7%BD%AE%E9%83%A8%E5%88%86/)
[basicproj 3 dal数据访问部分](https://imag-er.github.io/2025/08/15/basicproj-3-dal%E6%95%B0%E6%8D%AE%E8%AE%BF%E9%97%AE%E9%83%A8%E5%88%86/)
[basicproj 4 handler网络请求处理](https://imag-er.github.io/2025/08/15/basicproj-4-handler%E7%BD%91%E7%BB%9C%E8%AF%B7%E6%B1%82%E5%A4%84%E7%90%86/)
[basicproj 5 测试、工具](https://imag-er.github.io/2025/08/15/basicproj-5-%E6%B5%8B%E8%AF%95%E3%80%81%E5%B7%A5%E5%85%B7/)