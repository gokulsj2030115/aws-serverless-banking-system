# AWS Serverless Banking System

A cloud-native banking application demonstrating secure transaction processing using AWS Serverless services.


## Dashboard

![Architecture](screenshots/Architecture.png)

---

# Architecture

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

---

# Features

✅ Create Account

✅ Deposit Money

✅ Withdraw Money

✅ Transfer Money

✅ Transaction History

✅ Dashboard Analytics

✅ Event-Driven Processing

✅ Email Notifications

---

# AWS Services

- Amazon API Gateway
- AWS Lambda
- Amazon RDS PostgreSQL
- Amazon SQS
- Amazon SNS
- AWS Secrets Manager
- Amazon S3
- IAM
- Amazon CloudWatch

---

# Tech Stack

- HTML
- CSS
- JavaScript
- PostgreSQL
- AWS

---

# Screenshots

## Dashboard

![Dashboard](screenshots/Dashbaord.png)

---

## Deposit

![Deposit](screenshots/Deposit.png)

---

## Transfer

![Transfer](screenshots/Transfer.png)

---

## Transaction History

![Transactions](screenshots/Transaction.png)

---

## SNS Email Notification

![Email](screenshots/email.png)

---

## Lambda

![Lambda](screenshots/Lambda.png)

---

## Amazon SQS

![SQS](screenshots/SQS.png)

---

## Amazon SNS

![SNS](screenshots/SNS.png)

---

## Amazon S3 Website Hosting

![S3](screenshots/s3.png)

---

# API Endpoints

| Method | Endpoint |
|---------|----------|
| GET | /accounts |
| POST | /accounts |
| PUT | /accounts/{id}/deposit |
| PUT | /accounts/{id}/withdraw |
| POST | /transfer |
| GET | /transactions/{id} |
| DELETE | /accounts/{id} |

---

# Future Improvements

- AWS Step Functions
- Amazon Cognito
- Terraform
- CloudFront
- Route53
- GitHub Actions CI/CD
- Docker
- Kubernetes

---

# Author

**Gokul S**

AWS Certified Solutions Architect – Associate
