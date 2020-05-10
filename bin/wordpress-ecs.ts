#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { WordpressEcsStack } from '../lib/wordpress-ecs-stack';

const app = new cdk.App();
new WordpressEcsStack(app, 'WordpressEcsStack');
