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