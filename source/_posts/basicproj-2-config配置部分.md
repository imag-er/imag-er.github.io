---
title: basicproj 2 config配置部分
tags: [go]
date: 2025-08-15 14:37:30
---

### 1.viper介绍

config部分主要是用了go比较通用的配置读取工具viper
这里是[官网](https://github.com/spf13/viper) 的介绍机翻
> Viper 是一款面向 Go 应用程序（包括 12-Factor 应用）的完整配置解决方案，旨在满足应用程序内部的各类配置需求，支持多种配置格式与来源。其核心功能包括：
> - 设置默认配置值
> - 支持读取 JSON/TOML/YAML/HCL/envfile/Java 属性配置文件
> - 实时监控并重载配置文件（可选）
> - 从环境变量读取配置
> - 支持远程配置系统（etcd 或 Consul）并监听变更
> - 解析命令行参数
> - 从内存缓冲区读取
> - 直接设置显式配置值
> - Viper 可视为满足您所有应用配置需求的中央注册库。

这里用到的是读取yaml的功能


### 2.配置文件编写

这里写了两个配置文件,分别是`dev.yaml`和`online.yaml`, 用于在不同环境下使用.
这里可以把online的配置当成用docker部署时的配置, 但是我这里没有做.

##### dev.yaml
```
App:
  Name: basic-backend
  Host: localhost
  Port: 13271

Logger:
  Level: Info

Database:
  Host: localhost
  Port: 3306
  Username: root
  Password: root
  Name: basic-db

  MaxIdleConns: 10
  MaxOpenConns: 100
  ConnMaxLifetime: 3600

Redis:
  Host: localhost
  Port: 6379
  Password: ""
```

`dev.yaml`就写了一些简单的配置, 包括logger, db, redis的一些信息

##### online.yaml
```
App:
  Name: basic-backend
  Host: localhost
  Port: 13271

Logger:
  Level: Info

Database:
  Host: mysql
  Port: "%d"
  Username: "%s"
  Password: "%s"
  Name: "%s"

  MaxIdleConns: 10
  MaxOpenConns: 100
  ConnMaxLifetime: 3600

Redis:
  Host: redis
  Port: 6379
  Password: "%s"
```

online这里要注意的是两点
1. host需要写对应服务容器的名称才能被docker内部网络的dns解析
2. 这里敏感信息都先写placeholder, 等到运行时才从.env文件中读取, 然后使用`fmt.sprintf`写入, 公开代码时也需要屏蔽掉.env文件, 防止隐私泄露


### 3. 配置文件读取

`config.go`里面针对每个配置文件都定义了一个结构体, 用于解析, 实际上这里也可以全部使用匿名结构体(因为后面用不掉)
```go
type config struct {
	App      appConfig
	Logger   loggerConfig
	Database databaseConfig
	Redis    redisConfig
}

type appConfig struct {
	Host string
	Port int
	Name string
}


// 也可以这么写
type config struct {
	App      struct {
        Host string
        Port int
        Name string
    }
	Logger   struct { ... }
	Database struct { ... }
	Redis    struct { ... }
}

```


然后就是使用viper分环境读取
```go
var Config *config
func InitConfig() {
	godotenv.Load() // 从.env读取, 然后可以用os.getenv读取了

	if os.Getenv("GO_ENV") == "online" {
		hlog.Info("goenv: online")
		viper.SetConfigName("online")
	} else if os.Getenv("GO_ENV") == "dev" {
		hlog.Info("goenv: dev")
		viper.SetConfigName("dev")
	} else {
		hlog.Fatal("missing env key GO_ENV")
	}

	viper.SetConfigType("yaml") // config文件类型
	viper.AddConfigPath("./config") // 搜索config文件的目录

    ... // 读取config文件, unmarshal成config类型
}

```