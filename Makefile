# npm 更新していないとエラーが出やすいので適宜実行
.PHONY: cdk-npm-update
cdk-npm-update:
	cd cdk;	ncu -u; npm i

# make cdk-vpc-deploy STAGE=staging
# make cdk-vpc-deploy STAGE=production
.PHONY: cdk-vpc-deploy
cdk-vpc-deploy:
	cd cdk;	cdk deploy VpcStack -c stage=${STAGE}

.PHONY: cdk-vpc-destroy
cdk-vpc-destroy:
	cd cdk;	cdk destroy VpcStack -c stage=${STAGE}

.PHONY: cdk-ecs-deploy
cdk-ecs-deploy:
	cd cdk;	cdk deploy EcsStack -c stage=${STAGE}

.PHONY: cdk-ecs-destroy
cdk-ecs-destroy:
	cd cdk;	cdk destroy EcsStack -c stage=${STAGE}

.PHONY: cdk-pipeline-deploy
cdk-pipeline-deploy:
	cd cdk;	cdk deploy PipelineStack -c stage=${STAGE}

.PHONY: cdk-pipeline-destroy
cdk-pipeline-destroy:
	cd cdk;	cdk destroy PipelineStack -c stage=${STAGE}

.PHONY: docker-compose-destroy
docker-compose-destroy:
	docker-compose down --rmi all --volumes --remove-orphans
