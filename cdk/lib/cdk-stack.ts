import * as cdk from '@aws-cdk/core';
import ecr = require('@aws-cdk/aws-ecr');

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // イメージpushはcodebuilder
    const repository = new ecr.Repository(this, 'fargate-rds-cdk-repo-id', {
      repositoryName: "fargate-rds-cdk-repo-name"
    });
  }
}
