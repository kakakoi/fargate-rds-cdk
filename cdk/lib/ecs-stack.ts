import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam'
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecr from '@aws-cdk/aws-ecr';
import * as logs from '@aws-cdk/aws-logs';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2'
import * as ecrdeploy from '@aws-cdk/aws-ecr-assets';
import { ContextHelper } from './helper/context-helper';



const paramsConfig = {
  staging: {
    vpcId: "vpc-0105a6541310a237c",
    // subnetPrivateApp1: { subnetId: "subnet-0376154534a2591a4", az: "ap-northeast-1a" },//private
    // subnetPrivateApp2: { subnetId: "subnet-0b1c3d398925568f5", az: "ap-northeast-1c" },//private
    subnetPrivateApp1: { subnetId: "subnet-07c363125b7ce1306", az: "ap-northeast-1a" },//public
    subnetPrivateApp2: { subnetId: "subnet-092823d197dfb3877", az: "ap-northeast-1c" },//public
  },
  production: {
    vpcId: "",
    subnetPrivateApp1: { subnetId: "", az: "ap-northeast-1a" },
    subnetPrivateApp2: { subnetId: "", az: "ap-northeast-1c" },
  }
}

export class EcsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const contextHelper = new ContextHelper(scope) //name helper
    const params = paramsConfig[contextHelper.stage] // config params

    // VPC
    const vpc = ec2.Vpc.fromLookup(this, 'vpc', {
      vpcId: params.vpcId,
    }) as ec2.Vpc

    // INTERFACE ENDPOINT
    // setInterfaceEndpoint(vpc)

    // ECR
    const repository = ecr.Repository.fromRepositoryName(this, contextHelper.generate('ecr'),
      contextHelper.generate('ecr'))

    // IAM ECS APP
    const taskIamRole = new iam.Role(this, contextHelper.generate("ecs-task-role"), {
      roleName: contextHelper.generate("ecs-task-role"),
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // IAM ECS EXE
    const executionIamRole = new iam.Role(this, contextHelper.generate("ecs-execution-role"), {
      roleName: contextHelper.generate("ecs-execution-role"),
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('ecs.amazonaws.com'),
        new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy'
        )
      ]
    });

    // TASK DEFINITION
    const taskDefinition = new ecs.FargateTaskDefinition(this, contextHelper.generate('task'), {
      taskRole: taskIamRole, // タスク s3, rds
      executionRole: executionIamRole, //ECS image pull,CloudWatch
      cpu: 256,
      memoryLimitMiB: 512,
      family: contextHelper.generate('fargate-rds-cdk'),
    });

    // CLUSTER
    const cluster = new ecs.Cluster(this, contextHelper.generate('cluster'), {
      clusterName: contextHelper.generate('cluster'),
      vpc: vpc,
    })

    // SG SERVICE
    const serviceSg = new ec2.SecurityGroup(this, contextHelper.generate('ecs-sg'), {
      allowAllOutbound: true,
      securityGroupName: contextHelper.generate('ecs-sg'),
      vpc,
    })

    // LOG
    // const logGroup = new logs.LogGroup(this, contextHelper.generate("ecs-loggroup"), {
    //   logGroupName: contextHelper.generate("ecs-loggroup"),
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   retention: logs.RetentionDays.ONE_MONTH,
    // })

    // ECS
    const container = taskDefinition.addContainer(contextHelper.generate('container'), {
      // image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      image: ecs.ContainerImage.fromAsset('../')
      // portMappings: [{ containerPort: 80 }],
      // logging: ecs.LogDriver.awsLogs({
      //   streamPrefix: contextHelper.generate("ecs-log"),
      //   logGroup,
      // }),
    });

    // SERVICE
    const fargateService = new ecs.FargateService(this, contextHelper.generate("fargate-service"), {
      serviceName: contextHelper.generate("fargate-service"),
      cluster: cluster,
      // vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }),
      vpcSubnets: vpc.selectSubnets({
        subnets: [
          ec2.Subnet.fromSubnetAttributes(this, "private-subnet-app-1", {
            subnetId: params.subnetPrivateApp1.subnetId,
            availabilityZone: params.subnetPrivateApp1.az
          }),
          ec2.Subnet.fromSubnetAttributes(this, "private-subnet-app-2", {
            subnetId: params.subnetPrivateApp2.subnetId,
            availabilityZone: params.subnetPrivateApp2.az
          }),
        ]
      }),
      securityGroup: serviceSg,
      taskDefinition: taskDefinition,
      // desiredCount: 2,
      // maxHealthyPercent: 200,
      // minHealthyPercent: 50,
      // enableExecuteCommand: true, //ECS EXEC
    })

    // ALB TARGET
    // fargateService.loadBalancerTarget({
    //   containerName: container.containerName,
    //   containerPort: 80,
    // });

    // // ALB
    // createAlb(this, vpc, fargateService)
  }
}



// ALB SecurityGroup,TargetGroupを設定
function createAlb(
  scope: cdk.Construct,
  vpc: ec2.Vpc,
  fargateService: any): elbv2.ApplicationLoadBalancer {
  const contextHelper = new ContextHelper(scope)

  // ALB-SG
  const apiAlbSg = new ec2.SecurityGroup(scope, contextHelper.generate("alb-sg"), {
    vpc,
    allowAllOutbound: true,
    securityGroupName: contextHelper.generate("alb-sg")
  });
  apiAlbSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80)); // ECSとNLBの通信用
  apiAlbSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443)); // ECRからコンテナを取得する用

  // ALB
  const alb = new elbv2.ApplicationLoadBalancer(scope, contextHelper.generate("alb"), {
    vpc,
    loadBalancerName: contextHelper.generate("alb"),
    internetFacing: true,
    securityGroup: apiAlbSg,
    vpcSubnets: { subnets: vpc.publicSubnets },
  });

  // ALBのターゲットグループを作成する
  const albTargetGroup = new elbv2.ApplicationTargetGroup(scope, contextHelper.generate('alb-tg'), {
    healthCheck: {
      healthyHttpCodes: '200',
      healthyThresholdCount: 2,
      interval: cdk.Duration.seconds(30),
      path: '/',
      timeout: cdk.Duration.seconds(5),
      unhealthyThresholdCount: 2,
    },
    port: 80,
    protocol: elbv2.ApplicationProtocol.HTTP,
    targetGroupName: contextHelper.generate('alb-tg'),
    targetType: elbv2.TargetType.IP,
    vpc,
    deregistrationDelay: cdk.Duration.seconds(0) // 開発環境デプロイ高速化のため。本番環境は数値上げておく
  });

  alb.addListener(contextHelper.generate('alb-listener'), {
    port: 80,
    defaultTargetGroups: [albTargetGroup]
  });

  fargateService.attachToNetworkTargetGroup(albTargetGroup);
  fargateService.autoScaleTaskCount({ minCapacity: 1, maxCapacity: 2 })
    .scaleOnCpuUtilization(contextHelper.generate('auto-scale'), {
      targetUtilizationPercent: 80
    });

  return alb
}

// InterfaceEndpoint
// TODO: SG
function setInterfaceEndpoint(vpc: ec2.Vpc): void {
  vpc.addInterfaceEndpoint("ecr-endpoint", {
    service: ec2.InterfaceVpcEndpointAwsService.ECR,
    privateDnsEnabled: true
  })
  vpc.addInterfaceEndpoint("ecr-dkr-endpoint", {
    service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
    privateDnsEnabled: true
  })
  vpc.addInterfaceEndpoint("cloudwatch-logs-endpoint", {
    service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
    privateDnsEnabled: true
  })
  vpc.addInterfaceEndpoint('storage-endpoint', {
    service: ec2.InterfaceVpcEndpointAwsService.STORAGE_GATEWAY,
    privateDnsEnabled: true
  })
}