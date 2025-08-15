---
title: basicproj 4 handler网络请求处理
tags: [go,cloudwego]
date: 2025-08-15 14:38:02
---

### 路由配置
网络请求部分先在router中注册针对每个接口的路由
这里的代码主要展示了hertz中路由注册的语法, 基本上和gin是一致的
这里likes接口的path参数:id的语法是遵循了RESTful理念, 用id标识资源
```go
func InitRouter() (h *server.Hertz) {
	h = server.Default(
		server.WithHostPorts(fmt.Sprintf("%s:%d", config.Config.App.Host, config.Config.App.Port)),
	)

	h.Use(middleware.CORS()) // Cross Origin Request Share

	h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
		ctx.JSON(consts.StatusOK, utils.H{"message": "pong"})
	})

	authMW := middleware.InitJWT() // Initialize JWT middleware
	auth := h.Group("/api/auth")
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", authMW.LoginHandler)
	}
	
	api := h.Group("/api")
	
	api.GET("/articles/:id", handlers.GetArticlesById)
	api.GET("/articles", handlers.GetArticles)
	api.POST("/articles", handlers.CreateArticle)
	
	api.GET("/likes/:id", handlers.GetArticleLikes)
	api.POST("/likes/:id", handlers.LikesArticle)
	
	api.Use(authMW.MiddlewareFunc())
	{
		// 仅作示例, 为了测试的时候不带上jwt就把其他接口authfree了
		auth.POST("/logout", authMW.LogoutHandler)
	}

	return
}
```

这里使用了两个中间件 cors和jwt, 下面做一些介绍

### cors中间件

```go
func CORS() app.HandlerFunc {
	return cors.New(cors.Config{
		AllowOrigins:     []string{"localhost"},
		AllowMethods:     []string{"GET", "POST"},
		AllowHeaders:     []string{"Origin"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	})
}
```

用于允许部分请求的跨域访问, 因为运行时如果前后端的host或port不相同都会被认为“跨域”, 所以需要允许cors.


### jwt中间件

jwt全称json web token,用于身份认证,用户登录时会收到一个特定的jwt, 在请求需要鉴权的接口时需要在Header里带上 `Bearer <token>`才能通过jwt中间件的检查.

```go
type login struct {
	Username string `form:"username,required" json:"username"`
	Password string `form:"password,required" json:"password"`
}

var identityKey = "id"

authMiddleware, err := jwt.New(&jwt.HertzJWTMiddleware{
    Realm:       "test zone",
    Key:         []byte("secret key"),
    Timeout:     time.Hour,
    MaxRefresh:  time.Hour,
    IdentityKey: identityKey,
    PayloadFunc: func(data interface{}) jwt.MapClaims {
        if v, ok := data.(*models.User); ok {
            return jwt.MapClaims{
                identityKey: v.Username,
            }
        }
        return jwt.MapClaims{}
    },
    IdentityHandler: func(ctx context.Context, c *app.RequestContext) interface{} {
        claims := jwt.ExtractClaims(ctx, c)
        return &models.User{
            Username: claims[identityKey].(string),
        }
    },
    Authenticator: handlers.Login,
    Authorizator: func(data interface{}, ctx context.Context, c *app.RequestContext) bool {
        return true
    },
    Unauthorized: func(ctx context.Context, c *app.RequestContext, code int, message string) {
        c.JSON(code, utils.H{
            "code":    code,
            "message": message,
        })
    },
})

```

中间件使用的部分主要关注`Authenticator`, 用户请求过来之后会调用这个函数验证用户身份
```go
func Login(c context.Context, ctx *app.RequestContext) (interface{}, error) {
	var input struct {
		Username string `form:"username" json:"username"`
		Password string `form:"password" json:"password"`
	}
	if err := ctx.BindAndValidate(&input); err != nil {
		return "", jwt.ErrMissingLoginValues
	}

	// Check user credentials
	var user models.User
	if err := dal.DB.Where("username = ?", input.Username).First(&user).Error; err != nil {
		return nil, jwt.ErrFailedAuthentication
	}
	// **校验密码的地方不能直接判断hash值相等
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		return nil, jwt.ErrFailedAuthentication
	}

	return &user, nil
}
```
验证完成之后会返回User{}结构体给`PayloadFunc`, 这个函数会生成针对该用户的claim, 可以认为存储了 用户信息和jwt 的对应关系.用户信息的格式可以自己定义, 这里使用的是User数据模型(models/user.go). 
这里`IdentityHandler`和`PayloadFunc`做的是反的工作, 即 jwt <=> 个人信息.

### 请求处理

解析请求参数的部分使用了hertz的一个`BindAndValidate`

这个函数会检查参数的类型, 然后根据类型各字段的go-tag去尝试绑定参数, 如果tag里有`vd`则还会去做value的合法性校验.

##### formdata的绑定
```go
// model
type User struct {
	gorm.Model
	Username string `gorm:"unique" form:"username"`
	Password string `form:"password"`
}

// handler
func Register(c context.Context, ctx *app.RequestContext) {
	user := models.User{}

	if err := ctx.BindAndValidate(&user); err != nil {
		ctx.JSON(consts.StatusBadRequest, utils.H{
			"error": err.Error(),
		})
		return
	}
    ...

}
```
很明显这里绑定的就是formdata, 如果不写tag的话hertz会有一个默认的绑定顺序, 会逐个尝试直到失败, 具体顺序参考[文档](https://www.cloudwego.io/zh/docs/hertz/tutorials/basic-feature/binding-and-validate/#).

##### path param的绑定

上面展示的是form参数,这里也有path参数的例子
```go
// router
api.GET("/articles/:id", handlers.GetArticlesById)

// handler
func GetArticlesById(c context.Context, ctx *app.RequestContext) {
	var article models.Article
	id := ctx.Param("id") // here

	if err := dal.DB.First(&article, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			ctx.JSON(consts.StatusNotFound, utils.H{
				"message": "Article not found",
			})
			return
		}
		ctx.JSON(consts.StatusInternalServerError, utils.H{
			"message": "Failed to retrieve article: " + err.Error(),
		})
		return
	}
	ctx.JSON(consts.StatusOK, article)
}
```

##### 密码加密存储

注册和登陆的过程中, 密码传输是通过明文传输的, 但是存储到db时需要使用`bcrypt`加密. 这里遇到了一个小问题, 在用户登录时判断逻辑是
```go
userpasswd = db.get(username)
if userpasswd == hash(userinput) { ... }
```

这里直接判断相等是完全错误的, 需要使用`bcrypt.CompareHashAndPassword`方法来判断是否相同

```go
// Check user credentials
var user models.User
if err := dal.DB.Where("username = ?", input.Username).First(&user).Error; err != nil {
    return nil, jwt.ErrFailedAuthentication
}

// 校验密码的地方不能直接判断hash值相等
if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
    return nil, jwt.ErrFailedAuthentication
}
```