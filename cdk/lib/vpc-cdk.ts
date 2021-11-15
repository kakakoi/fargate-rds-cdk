import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import { ContextHelper } from './helper/context-helper';

export class VpcStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const contextHelper = new ContextHelper(scope)

        const vpc = new ec2.Vpc(this, contextHelper.generate("vpc"), {
            cidr: "10.1.0.0/16",
            natGateways: 0,
            maxAzs: 2,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: "public-app",
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: "private-app",
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
                {
                    cidrMask: 24,
                    name: "db",
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });
    }
}