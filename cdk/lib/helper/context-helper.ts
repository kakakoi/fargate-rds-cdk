import * as cdk from '@aws-cdk/core';

export interface StageName {
  staging:      string;
  production:     string;
}

// create Resource Name
export class ContextHelper {
  project: string
  stage: keyof StageName

  constructor(scope: cdk.Construct) {
    const stage = scope.node.tryGetContext('stage')
    if (stage !== 'staging' && stage !== 'production')
      throw Error(`invalid stage: ${stage}`)
    this.stage = stage
    this.project = scope.node.tryGetContext('project');
  }

  public generate(originalName: string): string {
    return `${this.project}-${originalName}-${this.stage}`;
  }
}