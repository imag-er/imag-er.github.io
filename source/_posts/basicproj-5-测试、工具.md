---
title: basicproj 5 测试、工具
tags: [go]
date: 2025-08-15 14:38:45
---



### 测试
`test/`目录下包含了若干测试脚本, 可以用于测试各个接口, 也包含了一部分异常情况
```sh
echo "正常情况"
curl -X POST  \
    -F "username=lsm" \
    -F "password=123" \
    "localhost:13271/api/auth/login" 
echo "\n============\n"

echo "异常情况1: 密码错误"
curl -X POST  \
    -F "username=lsm" \
    -F "password=13" \
    "localhost:13271/api/auth/login" 
echo "\n============\n"

echo "异常情况2: 用户名不存在"
curl -X POST  \
    -F "username=lm" \
    -F "password=123" \
    "localhost:13271/api/auth/login" 
echo "\n============\n"

...
```

有些测试脚本也需要通过命令行参数传入jwt
```sh
echo "正常情况"
curl -X POST  \
    -H "Authorization: Bearer $1" \
    "localhost:13271/api/auth/logout" 
echo "\n============\n"

echo "异常情况"
curl -X POST  \
    "localhost:13271/api/auth/logout" 
echo "\n============\n"
```


### 环境


### 工具类
一些零碎的小工具

用于计算密码hash的函数
```go
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash), err
}
```


hlog的初始化
```go
hlog.SetLogger(hlog.DefaultLogger())
hlog.SetLevel(logLevel())
```

loglevel的读取
```go
func logLevel() hlog.Level {
	loggerConfig := config.Config.Logger
	level := loggerConfig.Level
	switch strings.ToLower(level) {
	case "trace":
		return hlog.LevelTrace
	case "debug":
		return hlog.LevelDebug
	case "info":
		return hlog.LevelInfo

    ...
	default:
		hlog.Warnf("Unknown log level: %s, defaulting to info", level)
		return hlog.LevelInfo
	}
}
```