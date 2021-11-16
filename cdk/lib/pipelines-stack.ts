import { EcrStack } from './ecr-stack';
import { Construct, Stage, Stack, StackProps, StageProps, SecretValue } from '@aws-cdk/core';
import { CodePipeline, CodePipelineSource, ShellStep } from '@aws-cdk/pipelines';
import { ContextHelper } from './helper/context-helper';

/**
 * パイプラインを定義するStack
 */
export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const contextHelper = new ContextHelper(scope) //name helper

    const account = process.env.CDK_DEFAULT_ACCOUNT
    const region = process.env.CDK_DEFAULT_REGION

    const source = CodePipelineSource.connection('kakakoi/fargate-rds-cdk', 'main', {
      connectionArn: `arn:aws:codestar-connections:${region}:${account}:connection/a5e589b5-a2fb-4a9b-ba5d-bb945e058040`,
    })

    const pipeline = new CodePipeline(this, 'Pipeline', {
      synth: new ShellStep('Synth', {
        input: source,
        commands: [
          'cd cdk',
          'npm i -g npm && npm ci',
          'npx cdk synth',
          'ls -la',
          'mv cdk.out $CODEBUILD_SRC_DIR',
          'cd $CODEBUILD_SRC_DIR',//戻らないとs3にあげられない https://qiita.com/jucky330/items/5ccfc55d28291d94f2f4
        ],
      }),
    });

    const stage = new PipelinesStage(this, 'PipelinesStage', {
      env: {
        account: account,
        region: region,
      }
    })

    const ecrName = contextHelper.generate("ecr")

    pipeline.addStage(stage, {
      post: [new ShellStep('DockerBuild', {
        input: source,
        commands: [
          `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${account}.dkr.ecr.${region}.amazonaws.com`,
          `docker build -t ${ecrName} .`,
          `docker tag ${ecrName}:latest ${account}.dkr.ecr.${region}.amazonaws.com/${ecrName}:latest`,
          `docker push ${account}.dkr.ecr.${region}.amazonaws.com/${ecrName}:latest`
        ]
      })
      ]
    });
  }
}

/**
 * Deployable unit of ecr
 */
class PipelinesStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const ecrStack = new EcrStack(this, 'ecr');
  }
}