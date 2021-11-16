import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import { ContextHelper } from './helper/context-helper';

export class EcrStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const contextHelper = new ContextHelper(scope) //name helper

        // ECR
        const repository = new ecr.Repository(this, contextHelper.generate('ecr'), {
            repositoryName: contextHelper.generate("ecr"),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            lifecycleRules: [
                {
                    tagStatus: ecr.TagStatus.ANY,
                    maxImageCount: 3
                }
            ]
        });
    }
}