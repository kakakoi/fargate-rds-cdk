import { EcrStack } from './ecr-stack';
import { Construct, Stage, Stack, StackProps, StageProps, SecretValue } from '@aws-cdk/core';
import { CodePipeline, CodePipelineSource, ShellStep, CodeBuildStep } from '@aws-cdk/pipelines';
import { ContextHelper } from './helper/context-helper';
import * as iam from '@aws-cdk/aws-iam'
import * as ecr from '@aws-cdk/aws-ecr';
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

    // ECR NAME
    const ecrName = contextHelper.generate("ecr")
    // IAM CODEBUILD ECR
    const codebuildEcrRole = new iam.Role(this, contextHelper.generate("codebuild-ecr-role"), {
      roleName: contextHelper.generate("codebuild-ecr-role"),
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('ecs.amazonaws.com'),
        new iam.ServicePrincipal('codebuild.amazonaws.com'),
      ),
    });
    const codebuildRunPolicy = new iam.Policy(this, "codebuild-run", {
      policyName: "codebuild-run"
    })
    codebuildRunPolicy.addStatements(
      new iam.PolicyStatement({
        actions: ["codebuild:*","ecr:*"],
        effect: iam.Effect.ALLOW,
        resources: [`*`]
      })
    )

    codebuildRunPolicy.addStatements(
      new iam.PolicyStatement({
        actions: ["logs:GetLogEvents"],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:aws:logs:${region}:${account}:log-group:/aws/codebuild/*:*`
        ]
      })
    )

    pipeline.addStage(stage, {
      post: [
        new CodeBuildStep('DockerBuild', {
          buildEnvironment: { privileged: true },
          input: source,
          commands: [
            `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${account}.dkr.ecr.${region}.amazonaws.com`,
            `docker build -t ${ecrName} .`,
            `docker tag ${ecrName}:latest ${account}.dkr.ecr.${region}.amazonaws.com/${ecrName}:latest`,
            `docker push ${account}.dkr.ecr.${region}.amazonaws.com/${ecrName}:latest`
          ],
          role: codebuildEcrRole
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