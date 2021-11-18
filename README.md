
```bash
# https://dev.classmethod.jp/articles/try-aws-copilot/
$ brew install aws/tap/copilot-cli
$ copilot -v
$ copilot init

```

# sample

```bash
# https://docs.aws.amazon.com/AmazonECS/latest/developerguide/getting-started-aws-copilot-cli.html

copilot init --app demo                      \
  --name api                                 \
  --type 'Load Balanced Web Service'         \
  --dockerfile './Dockerfile'                \
  --port 80                                  \
  --deploy
```

# sampleを参考に実行

## input1
```bash
Application name: cop-fargate
```

## input 2
```bash
Which workload type best represents your architecture?  [Use arrows to move, type to filter, ? for more help]
  > Load Balanced Web Service
    Backend Service
    Scheduled Job
```

## input3
```bash
What do you want to name this Load Balanced Web Service? [? for help] cop-fargate-lb
```

## input3
```bash
Which port do you want customer traffic sent to? [? for help] (80) [Enter]
```
## input4 ここまで3分
```bash
Would you like to deploy a test environment? [? for help] (y/N) y
.
.
.
✔ Deployed service cop-fargate-lb. # ここまで14分
```

## スタックを確認

<img width="1091" alt="2021-11-18 17 16 07" src="https://user-images.githubusercontent.com/56661650/142378013-8cd13448-5834-413f-ba0e-0df5f2909066.png">


# copilot app delete

```bash
$ copilot app delete --name cop-fargate
```

# copilot apprunner

[AWS Copilot CLI を使用した永続性を持つ AWS App Runner サービスの継続的ワークフローの実現
 on 01 JUN 2021](https://aws.amazon.com/jp/blogs/news/enabling-continuous-workflows-for-aws-app-runner-service-with-persistency-using-aws-copilot-cli/)

```bash
$ copilot init
```
### choice (16min)
1. apprunner
2. Application name: cop-apprunner
3. Service name: cop-apprunner-svc
4. Dockerfile: ./Dockerfile

## db

```bash
$ copilot storage init
Only found one workload, defaulting to: cop-apprunner-svc
Storage type: DynamoDB
Storage resource name: Items
Partition key: ItemId
Partition key datatype: String
Sort key? No
✔ Wrote CloudFormation template for DynamoDB Table Items at copilot/cop-apprunner-svc/addons/Items.yml
```

### deploy

```bash (10min)
$ copilot deploy --name cop-apprunner-svc

```

```bash
$ brew install jq
$ npm run seed
```

## pipeline
```bash
$ copilot pipeline init
Which environment would you like to add to your pipeline?: test
Which repository would you like to use for your pipeline?: [Enter]

$ copilot pipeline update19:18
```
ここで、CodePipeline がリポジトリにアクセスできるようにするために、次のターミナル出力で説明されているように手動でアクションを実行する必要があります。

AWS アカウントにすでにサインインしている Web ブラウザの新しいタブで、コンソールの CodeSuite Connections を開きます。

接続名をクリックして詳細ビューに移動します。

“Update pending connection” ボタンをクリックすると、”Connect to GitHub” というタイトルのポップアップウィンドウが表示されます。

Connectまで手動

```
$ copilot pipeline status
```