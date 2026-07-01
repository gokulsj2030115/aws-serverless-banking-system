# AWS Serverless Banking System

A cloud-native banking application demonstrating secure transaction processing using AWS serverless services.

## Architecture

API Gateway
↓
AWS Lambda
↓
Amazon RDS PostgreSQL
↓
Amazon SQS
↓
Transaction Processor Lambda
↓
Amazon SNS
↓
Email Notification

## Features

- Create Account
- View Accounts
- Deposit Money
- Withdraw Money
- Transfer Money
- Event-driven Processing
- Email Notifications
- Analytics Dashboard
- Transaction History

## AWS Services

- API Gateway
- AWS Lambda
- Amazon RDS PostgreSQL
- Amazon SQS
- Amazon SNS
- Secrets Manager
- CloudWatch
- IAM

## Tech Stack

- HTML
- CSS
- JavaScript
- PostgreSQL

## Architecture Diagram

(Add architecture image here)

## Screenshots

(Add dashboard screenshots here)

## API Endpoints

GET /accounts

POST /accounts

PUT /accounts/{id}/deposit

PUT /accounts/{id}/withdraw

POST /transfer

GET /transactions/{id}

## Deployment

1. Create RDS PostgreSQL
2. Store credentials in Secrets Manager
3. Deploy Lambda functions
4. Configure API Gateway
5. Create SQS Queue
6. Create SNS Topic
7. Host frontend on Amazon S3

## Future Improvements

- AWS Step Functions
- Amazon Cognito Authentication
- Terraform IaC
- CloudFront + Route 53
- CI/CD with GitHub Actions
- Unit & Integration Tests
