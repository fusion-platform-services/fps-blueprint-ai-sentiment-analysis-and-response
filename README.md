# AI-Powered Sentiment Analysis Agent & Review Responder

A lightweight, modular blueprint that ingests guest feedback from multiple channels, runs OpenAI-powered sentiment + theme analysis in near real-time, and surfaces alerts, dashboards, and draft replies for restaurant staff.

Designed for low cost, horizontal scalability, and easy extensibility—so you can adapt it to any industry that deals with high-volume customer reviews.

## 🚦 Disclaimer

This repository is a reference implementation intended for learning and fast prototyping. Do not deploy it to production as-is without adding your own authentication, rate-limiting, data-retention policies, and security hardening.

## 📝 License

Released under the MIT License — see [LICENSE](/LICENSE) for details.

## 📑 Solution Design  

For a deep dive into the architecture—including purpose, context, container diagrams, data flow, and component details—see **[`docs/solution-design.md`](docs/solution-design.md)**.


## 📂 Repository Structure

```qraphql
.
├── docs/                   # Functional & technical docs, diagrams
├── data/                   # Mock JSON review data for local runs
├── ingestion/              # Ingestion Svc. Ingest guest feedback data
│   └── src/
├── curation/               # Curation Svc. Enrich the feedback data with customer data
│   └── src/
├── sentiment-procesing/    # Sentiment Evaluation, Response and Theme Extraction
│   └── src/
├── anomaly-detection/      # Trend & Anomaly Detection Service
│   └── src/
├── notification/           # Sends escalation messages to the relevant paging API.
│   └── src/
├── response/               # Send the response message to the social media provider via API
│   └── src/
├── grafana/                # Visual analytics and dashboard
│   └── dashboards/
│   └── datasources/
└── docker-compose.yaml     # Docker Compose file to spin up the whole stack
```

## 🚀 Getting Started

Prerequisites:
- Docker >= 23 and Docker Compose v2
- Node.js >= 18 for any local code edits/tests
- An OpenAI API key

Quick start:

```bash
git clone https://github.com/fusion-platform-services/fps-blueprint-ai-sentiment-analysis-and-response.git
cd fps-blueprint-ai-sentiment-analysis-and-response
cp .env.example .env         # fill secrets
docker compose up --build
# open http://localhost:3003 dashboard with mock data
```

🤝 Contributing

Bug reports, feature requests, and pull requests are welcome!
1. Open an issue in docs/ describing the change.
2. Fork → feature branch → PR.
3. Make sure npm test and docker compose up still work locally.

❓ Need Help?

* Check the service-specific READMEs under docs/.
* Search existing GitHub Issues.
* Open a new issue if you’re stuck — include logs, OS, and steps to reproduce.
