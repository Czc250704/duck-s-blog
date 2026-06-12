大家好，我是duck。这是Github使用教程系列。我们会结合**AI**对于我们的语言进行组织，保证易懂程度。我们会一直更新。今天我们来讲解注册Github，配置仓库。

---

**注意：**最好有自己的项目，如果没有请在桌面新建文本文档，重命名为<kdb>index.html</kdb>**后缀名要修改**
然后用记事本打开，复制一下代码，**不要改动**。粘贴在<kdb>index.html</kdb>保存即可
```html
<!DOCTYPE html>
<html>
    <head>
        <title>Hello Word</title>
    </head>
    <body>
        <h1>Hello Word</h1>
    </body>
</html>
```

---

第一步：注册 GitHub 账号（已有请登录（Sing in）后跳转下一步）

打开 github.com，要是没账号就点中间那个 Sign up，注册方式有Google，Apple，email。个人推荐使用email
Email就输入你的电子邮箱地址，路xxx@xxx.com
Password输入你要的密码，建议8个字符以上，一定要有数字和小写字母，不然不行。
Username输入用户名。注意：用户名采用英文最好，可以省去麻烦。
Your Country/Region选择China就行

注意，这用户名后面有大用，它会变成你网站域名的一部分，所以最好别起一串乱码，比如叫duck就比duck1863强。
接下来就是通过验证码的环节，验证码如果看不懂就开启浏览器翻译，看中文提示。如果不会的话，过个十几分钟再试，Github不同时间段的验证码方式是不一样的。

---

第二步：创建一个仓库

登录进去之后，看页面右上角，你的头像左边会有一个 “+” 号，点它，然后选 New repository。

这时候会跳到一个新建仓库的页面，好多英文别怕，只看几个地方：

1. Repository name 下面那个输入框，这步最关键，弄错你就白干了。
```
      填的名字随便，这是你的仓库名字
      注意：全小写，中间没空格。如果填对了，输入框下面会冒出来一行绿字儿，提示“你正在创建用户站点”，看到这个就稳了。
```
2. 下面那个 Description (描述) 爱写不写，随便。
3. 最重要的是，下面单选框一定选 Public——公开。 因为 GitHub Pages 在免费账号下，只有公开仓库才能用，你选 Private 的话后面就找不到按钮。
4. 底下有个 “Add a README file” 的勾选框，可以先不勾，后头我们自己加东西。
      然后，直接点绿的 Create repository 按钮。

好了，现在空仓库建好了，页面会跳进去。

---

第三步：往仓库里扔一个网页文件

现在你在这个空仓库的页面里，应该能看到一堆文件列表是空的，中间有个区域写着 “Quick setup”。别管它，咱们自己动手。

找到那个黑色的 Add file 按钮，点一下，选有上传标志的。
然后把<kdb>index.html</kdb>放入等上传完成后（进度条消失）拉到最下方点击绿色按钮就行，等跳转完成就上传成功了
---

第四步：打开 GitHub Pages 开关

现在离成功就差最后一口劲儿了。

在这个仓库页面顶部，找到一排标签：Code、Issues、Pull requests…… 往右看，有一个 Settings。点它。

进 Settings 之后，左边竖排菜单很长，往下使劲划拉，找到 Pages 这个选项。

现在右边会出现 “GitHub Pages” 的设置。咱们看 Build and deployment 那一块。
```
    · 在 Source 下面，有个下拉框，默认可能显示 “Deploy from a branch”，如果不是，你把它选成这个。
    · 然后下边会多出来 Branch 的选项，它旁边有个按钮，很可能显示 “None”。点它，选 main。
    · 再右边有个文件夹选择，默认应该是 / (root)，就保持这个别动。
    · 完事点那个 Save 按钮。
```
点完 Save，页面可能会自己刷新一下，然后你就能在 Pages 设置区域的最上方，看到一行字，大概长这样：

Your site is live at https://你的用户名.github.io

如果没马上看到，别慌，喝口水，等个一两分钟再刷新。

---

第五步：打开你的网站！

看到那个 https://xxxx.github.io 的链接之后，直接点它，或者复制到浏览器里打开。
只要不出意外，就出现了Hello Word。

---
以上是今天的全部内容，请继续关注codegin与duck的博客获取更多信息。

codegin账号：www.codegin.top
duck账号：duckpublic.qd.je

---
如果遇到访问不安全就点高级-->继续访问进入。