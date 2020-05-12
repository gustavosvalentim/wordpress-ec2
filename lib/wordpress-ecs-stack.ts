import { readFileSync } from 'fs';
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elb from '@aws-cdk/aws-elasticloadbalancingv2';
import * as autoscaling from '@aws-cdk/aws-autoscaling';
import * as rds from '@aws-cdk/aws-rds';


/**
 * Run a Wordpress on a EC2 instance
 * 
 * @param {cdk.Construct} scope Context of the stack.
 * @param {string} id Logical ID for this stack.
 * @param {cdk.StackProps} props Properties to be added to this stack.
 */
export class WordpressEcsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const wordpressUrl: string = this.node.tryGetContext('wordpressUrl');
    const nginxConfigUrl: string = this.node.tryGetContext('nginxConfigUrl');

    const vpc: ec2.Vpc = new ec2.Vpc(this, 'VPC');

    const loadBalancer: elb.ApplicationLoadBalancer = 
      new elb.ApplicationLoadBalancer(this, 'LoadBalancer', {
        vpc,
        internetFacing: true
      });
    // Create a new listener into load balancer
    const loadBalancerListener: elb.ApplicationListener =
      loadBalancer.addListener('LoadBalancerListener', {
        port: 80,
        open: true
      });

    const userData: string[] = readFileSync(`${__dirname}/assets/userdata.sh`)
                               .toString()
                               .replace('\r', '')
                               .replace('$WORDPRESS_URL', wordpressUrl)
                               .replace('$NGINX_CONFIG_URL', nginxConfigUrl)
                               .replace('$DOMAIN', 'minha.darioribeiro.com')
                               .split('\n');

    const autoScalingGroup: autoscaling.AutoScalingGroup = 
      new autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
        vpc,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.SMALL),
        machineImage: new ec2.AmazonLinuxImage({
          edition: ec2.AmazonLinuxEdition.STANDARD,
          generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
        }),
        vpcSubnets: {
          subnetType: ec2.SubnetType.PUBLIC
        },
        desiredCapacity: 1,
        maxCapacity: 3
      });

    // Add a init script to EC2
    // The script is located at assets/userdata.sh
    autoScalingGroup.addUserData(...userData);

    // Add AutoScaling Group to load balancer listener
    loadBalancerListener.addTargets('LoadBalancerListenerTargets', {
      targets: [
        autoScalingGroup
      ],
      port: 80
    });

    /**
     * Creates a MYSQL instance on RDS
     */
    const rdsMysqlInstanceProps: rds.DatabaseInstanceProps = {
      vpc,
      engine: rds.DatabaseInstanceEngine.MYSQL,
      instanceClass: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.SMALL),
      masterUsername: 'admin',
      masterUserPassword: new cdk.SecretValue('dariotrampo'),
      databaseName: 'wordpress',
      port: 3306,
      deletionProtection: false
    }
    const rdsMysqlInstance: rds.DatabaseInstance = new rds.DatabaseInstance(
      this,
      'MYSQLInstance',
      rdsMysqlInstanceProps
    );

    // Allow Load Balancer and AutoScaling to call RDS instance.
    loadBalancer.connections.securityGroups.map(
      sg => rdsMysqlInstance.connections.allowFrom(
        sg,
        ec2.Port.allTraffic(),
        'Inbound'
      )
    );

    autoScalingGroup.connections.securityGroups.map(
      sg => rdsMysqlInstance.connections.allowFrom(
        sg,
        ec2.Port.allTraffic(),
        'Inbound'
      )
    );
  }
}
