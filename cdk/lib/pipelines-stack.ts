import { EcrStack } from './ecr-stack';
import { Construct, Stage, Stack, StackProps, StageProps, SecretValue } from '@aws-cdk/core';
import { CodePipeline, CodePipelineSource, ShellStep } from '@aws-cdk/pipelines';

/**
 * パイプラインを定義するStack
 */
export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    const source = CodePipelineSource.connection('kakakoi/fargate-rds-cdk', 'main', {
      connectionArn: 'arn:aws:codestar-connections:ap-northeast-1:674115544340:connection/a5e589b5-a2fb-4a9b-ba5d-bb945e058040',
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
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      }
    })

    pipeline.addStage(stage, {
      post: [new ShellStep('DockerBuild', {
        input: source,
        commands: [
          'pwd'
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