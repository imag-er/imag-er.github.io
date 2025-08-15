---
title: basicproj 3 dal数据访问部分
tags: [go]
date: 2025-08-15 14:37:39
---
### 简介

dal全称 Data Access Layer数据访问层, 一般是程序与注册中心、数据库、缓存、配置中心等部分通信的接口, 用于将业务逻辑中的请求处理逻辑与数据访问逻辑解耦

这里主要是两个部分: db数据库 redis缓存
### 数据库

使用orm工具访问数据库可以避免直接编写复杂的sql语句, 同时也更方便做错误处理等等.
go语言常用的orm工具是gorm. 

这部分主要是要先定义数据模型, 见models
各个字段后面也定义了go-tag, 用于标识这些数据模型字段对应的formdata (post类型的网络请求体携带的数据)中的字段名.
而gorm会自动将go中的结构体字段名更改为符合数据库key的格式, 这个过程对于使用者是透明的. 

也就是说, 这里的model实际上对应了三个层: 网络请求 逻辑处理 数据访问, 在每个层都有自己不同的形式, 但是含义完全相同.
```go
// models/user.go
type User struct {
	gorm.Model
	Username string `gorm:"unique" form:"username"`
	Password string `form:"password"`
}

// models/articles.go
type Article struct {
	gorm.Model
	Title   string `form:"title,required"`
	Content string `form:"content,required"`
	Preview string `form:"preview,required"`
	Likes   int    `form:"likes" gorm:"default:0"`
}
```

数据库对象的部分主演就是要parse一下dsn (Data Source Name), 用于标识数据库位置并连接.
然后注意打开后要做一下migrate, 这里使用automigrate的作用是会创建相应的数据表, 以及其他的一些工作, 相见gorm文档. 

gorm本身还有很多特性值得研究 (关联 钩子 事务 etc.), 后续可能会出博客记录. 

```go
var DB *gorm.DB

func initDB() {
	dbconfig := config.Config.Database
    // 配置DSN
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbconfig.Username, dbconfig.Password, dbconfig.Host, dbconfig.Port, dbconfig.Name,
	)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
    
    // 设置mysql的一些参数
    sqlDB := db.DB()
	sqlDB.SetMaxIdleConns(dbconfig.MaxIdleConns)
	sqlDB.SetMaxOpenConns(dbconfig.MaxOpenConns)
	sqlDB.SetConnMaxLifetime(time.Second * time.Duration(dbconfig.ConnMaxLifetime))

	// 自动迁移数据模型
	modelsToMigrate := []interface{}{
		&models.User{},
		&models.Article{},
	}
	if err := db.AutoMigrate(modelsToMigrate...); err != nil {
		hlog.Fatal("failed to migrate database")
	}

	DB = db
}

```


### redis
redis是基于内存实现的KV存储工具, 作为nosql数据库中最热门的一个, 常被用来作为缓存.
后面也会做针对redis的研究文章.

redis的部分主要体现在网络请求层, 但是我想在这里描述.
连接redis的部分不介绍, 参见代码.

redis可以作为简单的内存数据库使用, 点赞相关逻辑就是这么实现的, 这部分内容不符合实际需求, 仅作redis存储、自增功能的展示
```go
func LikesArticle(c context.Context, ctx *app.RequestContext) {
	id := ctx.Param("id")

	likesArticle := "article:" + id + ":like"

	dal.RedisClient.Incr(likesArticle)
    ...
}

func GetArticleLikes(c context.Context, ctx *app.RequestContext) {
	id := ctx.Param("id")

	likesArticle := "article:" + id + ":like"

	likes, err := dal.RedisClient.Get(likesArticle)
    ...
}

```



本项目中redis工作方式是旁路由:
如果读取时命中缓存, 则返回缓存数据, 否则从db读取, 存入缓存并返回
创建、删除数据时清空缓存

```go
// handlers/article.go 有删改
func CreateArticle() {
	var article models.Article
	ctx.BindAndValidate(&article) // 解析请求参数
	dal.DB.Create(&article) // 将article存入db

	// 清除缓存, 下次请求时需重新加载数据
	dal.RedisClient.Del(articleKey)

	ctx.JSON(consts.StatusCreated, article) // 返回
}

func GetArticles(c context.Context, ctx *app.RequestContext) {
	var articles []models.Article
	// 如果从redis里能找到数据, 则返回
	// 否则从db查询, 序列化成json后存入redis
	cachedData, err := dal.RedisClient.Get(articleKey).Result()
	if err == redis.Nil {
		// 无缓存数据, 从DB读取, 并存入redis

		dal.DB.Find(&articles)
		data, err := json.Marshal(articles)

		// 从DB读取成功后, 更新缓存
		dal.RedisClient.Set(articleKey, data, 1*time.Minute)
	} else {
        // 有缓存数据, 直接取出来返回
		json.Unmarshal([]byte(cachedData), &articles)
		ctx.JSON(consts.StatusOK, articles)
	}
}
```