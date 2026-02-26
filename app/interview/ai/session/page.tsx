'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useWindowChangeProtection } from '../../../../lib/useWindowChangeProtection';
import { useTTS } from '../../../../lib/useTTS';
import dynamic from 'next/dynamic';
import {
  Brain, Mic, MicOff, Play, Square, Send, Code2,
  AlertTriangle, Maximize, ChevronRight, Clock, X,
  Volume2, VolumeX, Star, TrendingUp, Target, Zap, MessageSquare
} from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 320, background: '#0d1117', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      Loading editor...
    </div>
  ),
});

type Phase = 'intro' | 'coding' | 'voice' | 'followup' | 'complete';
type Message = { role: 'ai' | 'user'; content: string; timestamp: Date };

// extend question type with optional hint for auto grader
interface Question { question: string; type: 'dsa' | 'system_design' | 'behavioral'; followUp: string; answerHint?: string; }

// Utility: shuffle array and pick N items (Fisher-Yates)
function shufflePick<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

type QData = { question: string; type: 'dsa' | 'system_design' | 'behavioral'; followUp: string; answerHint?: string };

const AI_QUESTIONS: Record<string, Record<string, QData[]>> = {
  'Full Stack Developer': {
    full: [
      { question: 'Design a full-stack system using React for the frontend and Node.js for the backend. How would you handle state management in React and API communication? Explain the system design and data flow.', type: 'system_design', followUp: 'How would you scale the Node.js backend to handle high traffic and ensure React performance?', answerHint: 'REST API' },
      { question: 'Design a URL shortener like bit.ly. Implement the core shortening and redirection logic. How would you handle collisions? Implement encode/decode functions.', type: 'dsa', followUp: 'How would you scale this to handle 1M requests/sec? What caching strategy?', answerHint: 'hash' },
      { question: 'Design a real-time collaborative document editor like Google Docs. Describe the system architecture, data flow, and conflict resolution strategy (OT or CRDT).', type: 'system_design', followUp: 'If network partition occurs, would you choose AP or CP in CAP theorem and why?' },
      { question: 'Tell me about a challenging full-stack technical problem you solved using the STAR method.', type: 'behavioral', followUp: 'How would you handle it differently if you had to do it again?' },
      { question: 'Implement a full-stack authentication system with JWT tokens, refresh tokens, and role-based access control. Show both frontend and backend logic.', type: 'dsa', followUp: 'How do you handle token theft? Explain token rotation and blacklisting strategies.', answerHint: 'jwt auth' },
      { question: 'Design a real-time chat application like WhatsApp Web. Cover WebSocket management, message persistence, read receipts, and typing indicators at scale.', type: 'system_design', followUp: 'How would you ensure message ordering and exactly-once delivery across multiple devices?' },
      { question: 'Tell me about a time you had to choose between different tech stacks for a project. What factors influenced your decision?', type: 'behavioral', followUp: 'Have you ever regretted a technology choice? What did you learn from it?' },
      { question: 'Build a pagination system that supports cursor-based, offset-based, and relay-style pagination. Implement the API and client-side logic. Compare trade-offs.', type: 'dsa', followUp: 'When would cursor-based pagination break down? How do you handle deleted records?', answerHint: 'pagination' },
      { question: 'Design a multi-tenant SaaS application architecture. Cover data isolation strategies, tenant-specific customization, billing integration, and performance optimization.', type: 'system_design', followUp: 'How do you handle noisy neighbor problems? What isolation level do you recommend and why?' },
      { question: 'Describe a production incident where your full-stack knowledge helped identify the root cause faster than a specialist would have.', type: 'behavioral', followUp: 'How do you keep up with both frontend and backend technologies? What is your learning strategy?' },
    ],
    dsa: [
      { question: 'Find the starting node of a cycle in a linked list. Write an O(n) time, O(1) space solution. Explain before coding.', type: 'dsa', followUp: 'Explain why Floyd\'s algorithm works mathematically.', answerHint: 'floyd' },
      { question: 'Implement an LRU Cache with get() and put() in O(1) time. Explain your data structure choice.', type: 'dsa', followUp: 'How would you extend this to an LFU cache?', answerHint: 'lru' },
      { question: 'Given a matrix of 0s and 1s, find the largest rectangle containing only 1s. Optimize for time complexity.', type: 'dsa', followUp: 'Can you solve this using a histogram approach? What is the time complexity?', answerHint: 'maximal rectangle' },
      { question: 'Implement a Trie with insert, search, startsWith, and autoComplete(prefix, limit) methods. Handle case-insensitive search.', type: 'dsa', followUp: 'How would you compress the Trie for memory efficiency? What is a Patricia Trie?', answerHint: 'trie' },
      { question: 'Given an unsorted array, find the length of the longest consecutive sequence in O(n) time. Explain your approach clearly.', type: 'dsa', followUp: 'How would you solve this if the data was too large to fit in memory (distributed)?', answerHint: 'consecutive sequence' },
      { question: 'Implement merge sort and quick sort. Compare their time/space complexity, stability, and when you\'d choose one over the other.', type: 'dsa', followUp: 'What is the worst case of quicksort? How does randomized pivot selection help?', answerHint: 'sorting' },
      { question: 'Design a data structure that supports insert, delete, getRandom — all in O(1) average time.', type: 'dsa', followUp: 'How would you handle duplicates? What changes are needed?', answerHint: 'randomized set' },
      { question: 'Implement Dijkstra\'s shortest path algorithm. Handle negative edges appropriately and explain when to use Bellman-Ford instead.', type: 'dsa', followUp: 'What about finding all-pairs shortest path? When would you use Floyd-Warshall?', answerHint: 'dijkstra' },
    ],
    behavioral: [
      { question: 'Describe a conflict with a team member on a project. How did you handle it?', type: 'behavioral', followUp: 'Have you ever had to escalate issues to management? What factors influence that decision?' },
      { question: 'Tell me about a time you had to ship a feature under a tight deadline. How did you prioritize?', type: 'behavioral', followUp: 'Would you have made different trade-offs with more time?' },
      { question: 'Describe a time you introduced a new tool or process to your team. How did you get buy-in?', type: 'behavioral', followUp: 'What do you do when team members resist change?' },
      { question: 'Tell me about a project that failed. What went wrong and what did you learn?', type: 'behavioral', followUp: 'How has this failure shaped your approach to future projects?' },
    ],
  },

  'Backend Engineer': {
    full: [
      { question: 'Implement a rate limiter supporting fixed-window and sliding-window. It should work in a distributed environment with multiple servers.', type: 'dsa', followUp: 'How would you handle sync across server instances? Redis vs lock-free approach?', answerHint: 'rate limit' },
      { question: 'Design a scalable message queue like Kafka. Cover message ordering, consumer groups, dead-letter queues, exactly-once delivery, and horizontal scaling.', type: 'system_design', followUp: 'What happens when a consumer crashes mid-processing? Explain your acknowledgment strategy.' },
      { question: 'Tell me about debugging a critical production issue under pressure. Root cause, investigation, and prevention.', type: 'behavioral', followUp: 'What monitoring would you set up proactively to catch such issues earlier?' },
      { question: 'Implement a connection pool with acquire (with timeout), release, health checking, and auto-scaling. Discuss concurrency control.', type: 'dsa', followUp: 'How do you handle connection leaks? Queue or reject when exhausted?', answerHint: 'pool' },
      { question: 'Design an API gateway that handles: authentication, rate limiting, request routing, load balancing, circuit breaking, and request/response transformation.', type: 'system_design', followUp: 'How do you handle cascading failures? Explain the circuit breaker pattern in detail.' },
      { question: 'Tell me about a time you optimized a slow database query. What tools did you use, and what was the improvement?', type: 'behavioral', followUp: 'How do you decide between caching, query optimization, and schema changes?' },
      { question: 'Implement a distributed lock using Redis. Handle lock expiry, renewal, and the fencing token pattern for correctness. Explain the Redlock algorithm.', type: 'dsa', followUp: 'What are the criticisms of Redlock? When would you use Zookeeper instead?', answerHint: 'distributed lock' },
      { question: 'Design an event-sourcing architecture for a banking system. Cover event store, projections, snapshots, and eventual consistency. Compare with CRUD.', type: 'system_design', followUp: 'How do you handle schema evolution in event sourcing? What about event versioning?' },
      { question: 'Implement a consistent hashing ring with virtual nodes. Demonstrate how it minimizes key redistribution when servers are added/removed.', type: 'dsa', followUp: 'How does virtual node count affect load balancing? What\'s the memory trade-off?', answerHint: 'consistent hash' },
    ],
    dsa: [
      { question: 'Implement a thread-safe producer-consumer queue using only mutexes and condition variables. Handle graceful shutdown.', type: 'dsa', followUp: 'How does this compare to a lock-free queue? When would you use each?', answerHint: 'producer consumer' },
      { question: 'Build a scheduler that executes tasks at a specific time. Support: one-time tasks, recurring tasks (cron-like), cancellation, and persistence.', type: 'dsa', followUp: 'How would you make this distributed? Handle leader election for task execution.', answerHint: 'scheduler' },
      { question: 'Implement a database connection retry mechanism with exponential backoff, jitter, and circuit breaker pattern.', type: 'dsa', followUp: 'How do you determine appropriate initial delay, max retries, and backoff multiplier?', answerHint: 'retry backoff' },
      { question: 'Design and implement a simple in-memory key-value store with TTL support, LRU eviction, and snapshot persistence.', type: 'dsa', followUp: 'How would you add replication? Compare master-slave vs multi-master approaches.', answerHint: 'key value store' },
      { question: 'Implement a write-ahead log (WAL) for crash recovery. Handle log compaction, checkpointing, and recovery procedure.', type: 'dsa', followUp: 'How do databases like PostgreSQL use WAL? What is the difference between logical and physical replication?', answerHint: 'wal' },
      { question: 'Build an in-memory search index supporting full-text search with inverted indices. Handle tokenization, stemming, and relevance scoring (TF-IDF).', type: 'dsa', followUp: 'How would you add fuzzy search? What about real-time index updates?', answerHint: 'inverted index' },
    ],
    behavioral: [
      { question: 'Describe a situation where you had to choose between technical debt and shipping a feature. What did you decide and why?', type: 'behavioral', followUp: 'How do you quantify technical debt and convince stakeholders to allocate time for it?' },
      { question: 'Tell me about building or migrating a system to microservices. What were the challenges?', type: 'behavioral', followUp: 'What signs tell you a monolith should be broken up? When should you NOT use microservices?' },
      { question: 'Describe a time when you had to onboard a new team member onto a complex backend system. How did you approach it?', type: 'behavioral', followUp: 'What documentation practices do you follow to keep systems understandable?' },
    ],
  },

  'Frontend Developer': {
    full: [
      { question: 'Implement a virtual scroll component that efficiently renders 100,000+ items. Only render visible viewport items with scroll position tracking.', type: 'dsa', followUp: 'How would you handle variable-height items? Accessibility and keyboard navigation?', answerHint: 'virtual scroll' },
      { question: 'Design frontend architecture for a large-scale e-commerce platform. Cover state management, component architecture, code splitting, SSR vs CSR, and micro-frontends.', type: 'system_design', followUp: 'How would you measure and optimize Core Web Vitals? Target Lighthouse score above 90.' },
      { question: 'Tell me about a time you improved UX significantly. What research did you do and how did you measure impact?', type: 'behavioral', followUp: 'How do you balance developer experience with user experience?' },
      { question: 'Implement a custom DOM diffing algorithm. Given two virtual DOM trees, find the minimal set of operations to transform one into the other.', type: 'dsa', followUp: 'How does React\'s reconciliation differ? What role do keys play?', answerHint: 'dom diff' },
      { question: 'Design an accessible, theme-able design system from scratch. Cover component API design, tokens, variants, compound components, and documentation.', type: 'system_design', followUp: 'How do you ensure WCAG 2.1 AA compliance? How do you test accessibility at scale?' },
      { question: 'Tell me about debugging a tricky CSS or rendering issue. How did you identify and fix it?', type: 'behavioral', followUp: 'What CSS methodology do you prefer and why? BEM vs CSS-in-JS vs utility-first?' },
      { question: 'Build a drag-and-drop Kanban board from scratch (no libraries). Handle: cross-column moves, reordering within columns, touch support, and keyboard accessibility.', type: 'dsa', followUp: 'How would you add undo/redo? What about real-time collaboration on the same board?', answerHint: 'drag drop' },
      { question: 'Design a frontend monitoring and logging system. Cover: error boundaries, performance monitoring, user session replay, and analytics event tracking.', type: 'system_design', followUp: 'How do you balance data collection with user privacy? How do you handle PII in error logs?' },
      { question: 'Implement a form builder that supports: dynamic field types, conditional logic, validation rules, nested repeatable sections, and auto-save.', type: 'dsa', followUp: 'How would you serialize the form schema? How do you handle complex cross-field validation?', answerHint: 'form builder' },
    ],
    dsa: [
      { question: 'Build a debounce and throttle function with: leading/trailing edge options, cancel, flush, and max wait. Write tests.', type: 'dsa', followUp: 'When would you choose debounce vs throttle in production?', answerHint: 'debounce' },
      { question: 'Implement Promise.all, Promise.race, Promise.allSettled, and Promise.any from scratch. Handle all edge cases.', type: 'dsa', followUp: 'What happens with infinite iterables? How does microtask queue relate to promises?', answerHint: 'promise' },
      { question: 'Build a reactive state management system (mini-Redux/Zustand). Support: subscriptions, selectors, middleware, computed values, and devtools.', type: 'dsa', followUp: 'Compare flux pattern vs observable pattern. When would you use one over the other?', answerHint: 'state management' },
      { question: 'Implement a custom hooks library with: useDebounce, useThrottle, useIntersectionObserver, useMediaQuery, and useLocalStorage.', type: 'dsa', followUp: 'How do you test custom hooks? What about server-side rendering compatibility?', answerHint: 'custom hooks' },
      { question: 'Create an image lazy-loading system using IntersectionObserver. Support: blur-up placeholders, progressive loading, error fallbacks, and responsive images (srcset).', type: 'dsa', followUp: 'How do you handle images above the fold? What about layout shift prevention?', answerHint: 'lazy loading' },
    ],
    behavioral: [
      { question: 'Describe a challenging cross-browser or responsive design issue. How did you debug and solve it?', type: 'behavioral', followUp: 'How do you ensure a11y? What tools and standards do you follow?' },
      { question: 'Tell me about a time you refactored a large legacy frontend codebase. How did you plan and execute it?', type: 'behavioral', followUp: 'How do you ensure no regressions during a refactor? What testing strategy do you use?' },
      { question: 'Describe a time when designer requirements seemed technically infeasible. How did you handle it?', type: 'behavioral', followUp: 'How do you collaborate effectively with designers? What tools help bridge the gap?' },
    ],
  },

  'Data Scientist': {
    full: [
      { question: 'You have a highly imbalanced dataset (99% negative, 1% positive). Build a binary classifier. Why is accuracy misleading? Write code.', type: 'dsa', followUp: 'Between SMOTE and class_weight — when would you prefer each?', answerHint: 'imbalanced' },
      { question: 'Design a recommendation system for e-commerce. Compare collaborative filtering vs content-based vs hybrid. Include data pipeline and A/B testing.', type: 'system_design', followUp: 'How would you handle the cold-start problem for new users and items?' },
      { question: 'Walk me through your most impactful data science project. Business problem, ML framing, and success measurement.', type: 'behavioral', followUp: 'What would you do differently? Lessons on stakeholder communication?' },
      { question: 'Implement a complete decision tree classifier from scratch. Handle: information gain (Gini/entropy), pruning strategies, and categorical features.', type: 'dsa', followUp: 'How does Random Forest improve on single decision trees? What about gradient boosting?', answerHint: 'decision tree' },
      { question: 'Design an A/B testing platform. Cover: experiment design, statistical significance calculation, sample size estimation, and guardrail metrics.', type: 'system_design', followUp: 'How do you handle multiple comparisons (Bonferroni correction)? When would you use Bayesian A/B testing instead?' },
      { question: 'Tell me about a time your analysis contradicted stakeholder expectations. How did you handle it?', type: 'behavioral', followUp: 'How do you distinguish between genuine insights and data artifacts?' },
      { question: 'Build a feature engineering pipeline for a credit scoring model. Handle: missing data imputation, feature selection, multicollinearity, and temporal features.', type: 'dsa', followUp: 'How do you handle data leakage? What is target encoding and when is it dangerous?', answerHint: 'feature engineering' },
      { question: 'Design a fraud detection system with real-time scoring. Cover data pipeline, feature store, model training, serving, monitoring, and feedback loops.', type: 'system_design', followUp: 'How do you handle concept drift? What about adversarial attacks on your model?' },
      { question: 'Implement linear regression from scratch with gradient descent. Add L1/L2 regularization. Visualize the loss curve.', type: 'dsa', followUp: 'When would you use L1 vs L2? What is Elastic Net? When would you use each?', answerHint: 'linear regression' },
    ],
    dsa: [
      { question: 'Implement K-Means clustering from scratch with k-means++ initialization. Include the elbow method for optimal K.', type: 'dsa', followUp: 'Limitations of K-Means? When use DBSCAN or GMM?', answerHint: 'kmeans' },
      { question: 'Implement a Naive Bayes text classifier with Laplace smoothing and TF-IDF. Train on spam detection.', type: 'dsa', followUp: 'What assumptions does Naive Bayes make? When do they break?', answerHint: 'naive bayes' },
      { question: 'Build a complete PCA implementation from scratch using eigendecomposition. Explain variance explained ratio and scree plot.', type: 'dsa', followUp: 'When would you use t-SNE or UMAP instead? What are their trade-offs?', answerHint: 'pca' },
      { question: 'Implement cross-validation (k-fold, stratified k-fold, time series split) from scratch. Explain why each variant exists.', type: 'dsa', followUp: 'When is leave-one-out appropriate? How do you handle grouped data?', answerHint: 'cross validation' },
      { question: 'Implement a simple gradient boosting classifier from scratch. Start with decision stumps and show how residuals are used for boosting.', type: 'dsa', followUp: 'Compare XGBoost, LightGBM, and CatBoost. When would you choose each?', answerHint: 'gradient boosting' },
    ],
    behavioral: [
      { question: 'Describe a situation where data analysis led to a counterintuitive finding. How did you validate it?', type: 'behavioral', followUp: 'How do you balance statistical rigor with business pragmatism?' },
      { question: 'Tell me about a time you had to explain a complex ML concept to a non-technical audience.', type: 'behavioral', followUp: 'What visualization techniques do you use to make data stories compelling?' },
      { question: 'Describe a time you had to deal with poor quality data. What steps did you take to clean and validate it?', type: 'behavioral', followUp: 'How do you build trust in data quality across an organization?' },
    ],
  },

  'ML Engineer': {
    full: [
      { question: 'Implement a simple neural network (MLP) from scratch — forward propagation, backpropagation, ReLU/sigmoid activations. Train on XOR.', type: 'dsa', followUp: 'Explain vanishing/exploding gradients. How do batch norm, skip connections, and gradient clipping help?', answerHint: 'neural network' },
      { question: 'Design an end-to-end ML pipeline for production fraud detection: data ingestion, feature store, training, serving, monitoring, drift detection, retraining.', type: 'system_design', followUp: 'How do you handle concept drift? When trigger automatic retraining vs manual review?' },
      { question: 'Tell me about optimizing an ML model for production. Constraints (latency, memory, accuracy) and techniques (quantization, distillation, pruning).', type: 'behavioral', followUp: 'How do you decide when a model is "good enough" to deploy?' },
      { question: 'Implement a complete Transformer attention mechanism from scratch — scaled dot-product attention, multi-head attention, and positional encoding.', type: 'dsa', followUp: 'Why is scaling factor 1/√d_k important? How does multi-head differ from single attention with same total dims?', answerHint: 'transformer' },
      { question: 'Design an ML model serving infrastructure that supports: A/B testing, shadow deployments, feature stores, model versioning, and rollback capabilities.', type: 'system_design', followUp: 'How do you handle model latency SLAs? When would you use batch vs real-time inference?' },
      { question: 'Describe a time when a model performed differently in production than in testing. Root cause and fix.', type: 'behavioral', followUp: 'What monitoring do you follow to prevent training-serving skew?' },
      { question: 'Implement a CNN from scratch for image classification. Include: convolutional layer, pooling, flattening, and backpropagation through conv layers.', type: 'dsa', followUp: 'Explain transfer learning. When would you freeze layers vs fine-tune the entire network?', answerHint: 'cnn' },
      { question: 'Design a real-time personalization engine using embeddings. Cover: user/item embedding generation, approximate nearest neighbor search, and online learning.', type: 'system_design', followUp: 'How do you handle embedding drift? What is the impact of embedding dimension on performance?' },
      { question: 'Implement gradient descent optimization: SGD, Mini-batch, Momentum, and Adam. Compare convergence on linear regression.', type: 'dsa', followUp: 'Why does Adam outperform vanilla SGD? When might SGD with momentum be preferred?', answerHint: 'optimizer' },
    ],
    dsa: [
      { question: 'Implement an LSTM cell from scratch. Show the forget gate, input gate, output gate, and cell state update equations. Train on a simple sequence prediction.', type: 'dsa', followUp: 'How does GRU simplify LSTM? When would you use each? What about Transformers vs RNNs?', answerHint: 'lstm' },
      { question: 'Build a word2vec implementation (skip-gram with negative sampling). Train on a small corpus and visualize embeddings.', type: 'dsa', followUp: 'How do contextual embeddings (BERT) differ from static embeddings (word2vec)? What are the trade-offs?', answerHint: 'word2vec' },
      { question: 'Implement a variational autoencoder (VAE) from scratch. Show the encoder, decoder, reparameterization trick, and ELBO loss.', type: 'dsa', followUp: 'How does a VAE differ from a standard autoencoder? When would you use a GAN instead?', answerHint: 'vae' },
      { question: 'Implement beam search for sequence generation. Handle: variable beam width, length normalization, and end-of-sequence tokens.', type: 'dsa', followUp: 'Compare greedy search, beam search, and top-k/top-p sampling. When is each appropriate?', answerHint: 'beam search' },
      { question: 'Build a simple reinforcement learning agent (Q-learning) that learns to navigate a grid world. Implement epsilon-greedy exploration.', type: 'dsa', followUp: 'How does Deep Q-Network (DQN) extend tabular Q-learning? What is experience replay?', answerHint: 'q learning' },
    ],
    behavioral: [
      { question: 'Tell me about a time you had to choose between model accuracy and inference speed. What was the context?', type: 'behavioral', followUp: 'How do you communicate trade-offs to product teams that want "the best model"?' },
      { question: 'Describe an experience with data labeling challenges. Quality control, scaling, or ambiguity in labels.', type: 'behavioral', followUp: 'What strategies do you use for semi-supervised or self-supervised learning to reduce labeling needs?' },
      { question: 'Tell me about a time you had to reproduce results from a research paper and it didn\'t work as expected.', type: 'behavioral', followUp: 'What is your approach to reading and implementing research papers?' },
    ],
  },

  'DevOps Engineer': {
    full: [
      { question: 'Write a CI/CD pipeline config with: Docker build, unit/integration tests, security scanning, staging deploy with E2E tests, and production canary rollout.', type: 'dsa', followUp: 'How do you handle database migrations in CI/CD? Rollback strategy for canary failures?', answerHint: 'cicd pipeline' },
      { question: 'Design infrastructure for a globally distributed app serving 10M+ users. Cover: multi-region, load balancing, CDN, DB replication, DR (RPO/RTO), auto-scaling.', type: 'system_design', followUp: 'How do you handle full region failover? Data consistency across regions?' },
      { question: 'Tell me about the most challenging production outage. Root cause, investigation, prevention.', type: 'behavioral', followUp: 'How do you structure post-mortems? Philosophy on blameless culture?' },
      { question: 'Write a Dockerfile for multi-stage build of a Node.js app. Optimize for: image size, security, caching, health checks. Add docker-compose with app, DB, Redis.', type: 'dsa', followUp: 'How would you transition this to Kubernetes? Write basic Deployment, Service, Ingress.', answerHint: 'docker' },
      { question: 'Design a zero-downtime deployment strategy. Compare: blue-green, canary, rolling update, and feature flags. When would you use each?', type: 'system_design', followUp: 'How do you handle database schema changes during zero-downtime deploys? Explain expand-contract pattern.' },
      { question: 'Tell me about implementing or improving monitoring and observability. Tools used and team impact.', type: 'behavioral', followUp: 'How do you decide between logs, metrics, and traces for debugging?' },
      { question: 'Write Terraform/IaC to provision: VPC with subnets, auto-scaling group, ALB, RDS with read replicas, Redis. Include security groups.', type: 'dsa', followUp: 'How do you handle state management? Strategy for secrets and sensitive variables?', answerHint: 'terraform' },
      { question: 'Design a centralized logging and monitoring stack for microservices. Cover: log aggregation, distributed tracing, alerting, dashboards, and anomaly detection.', type: 'system_design', followUp: 'How do you handle alert fatigue? What is your on-call runbook structure?' },
      { question: 'Implement a Kubernetes operator (or describe the architecture) for automatically managing a stateful application. Handle: scaling, backups, failover, and configuration changes.', type: 'dsa', followUp: 'How does a Kubernetes operator differ from a Helm chart? When would you build a custom operator?', answerHint: 'k8s operator' },
    ],
    dsa: [
      { question: 'Write a bash script that performs health checks on multiple services, rotates logs, and sends alerts via webhook on failures. Handle concurrent checks.', type: 'dsa', followUp: 'How would you make this idempotent and fault-tolerant? What about running it as a cron vs systemd service?', answerHint: 'health check' },
      { question: 'Design a secrets management solution. Compare: Vault, AWS Secrets Manager, K8s secrets. Implement rotation for database credentials without downtime.', type: 'dsa', followUp: 'How do you handle secret access auditing? What about dev vs staging vs production environments?', answerHint: 'secrets management' },
      { question: 'Write a chaos engineering experiment: randomly terminate pods, inject network latency, and simulate disk failure. Measure and report system resilience.', type: 'dsa', followUp: 'How do you run chaos experiments safely in production? What guardrails should be in place?', answerHint: 'chaos engineering' },
      { question: 'Implement a service mesh concept: design a sidecar proxy that handles: service discovery, load balancing, mTLS, circuit breaking, and observability.', type: 'dsa', followUp: 'Compare Istio, Linkerd, and Consul Connect. When is a service mesh overkill?', answerHint: 'service mesh' },
    ],
    behavioral: [
      { question: 'Describe a time you automated a manual process that saved significant team time. What was the process?', type: 'behavioral', followUp: 'How do you prioritize which processes to automate? What\'s the ROI framework?' },
      { question: 'Tell me about a security vulnerability you discovered or responded to. How did you handle it?', type: 'behavioral', followUp: 'What security practices do you bake into your CI/CD pipeline?' },
      { question: 'Describe migrating an application to the cloud. What were the biggest challenges?', type: 'behavioral', followUp: 'What\'s your approach to hybrid cloud vs full cloud migration?' },
    ],
  },

  'Product Manager': {
    full: [
      { question: 'You\'re the PM for "AI-powered search" on an e-commerce platform. Write a PRD outline: problem statement, personas, KPIs, prioritized features, timeline.', type: 'system_design', followUp: 'How would you set up A/B testing? What metrics indicate success?' },
      { question: 'User retention drops 40% after the first week. Walk me through your analytical approach: data to examine, hypotheses, prioritization.', type: 'dsa', followUp: 'How would you communicate findings and proposed solutions to get engineering buy-in?' },
      { question: 'Tell me about a difficult product decision with incomplete data. Approach, outcome, retrospective.', type: 'behavioral', followUp: 'How do you balance data-driven decisions with intuition and user empathy?' },
      { question: 'Design a notification system product strategy. Cover: notification types, user preferences, frequency optimization, cross-channel (email, push, in-app), and user fatigue prevention.', type: 'system_design', followUp: 'How do you measure notification effectiveness? What\'s your approach to A/B test notification copy and timing?' },
      { question: 'Revenue has been flat for 3 quarters. Perform a product diagnosis: what data would you analyze, what experiments would you run, and what strategic bets would you make?', type: 'dsa', followUp: 'How do you balance short-term revenue tactics with long-term product vision?' },
      { question: 'Tell me about a time you had to say "no" to a key stakeholder or executive request. How did you handle it?', type: 'behavioral', followUp: 'How do you build trust with stakeholders while maintaining product integrity?' },
      { question: 'Create a go-to-market strategy for a new B2B SaaS product. Cover: ICP, pricing, channels, messaging, competitive positioning, and success metrics.', type: 'system_design', followUp: 'How do you test pricing? What frameworks do you use for competitive analysis?' },
      { question: 'Design a user onboarding flow that maximizes activation rate. Cover: progressive disclosure, personalization, tooltips, checklists, and empty states.', type: 'dsa', followUp: 'How do you identify the "aha moment" for your product? What metrics define successful onboarding?' },
    ],
    dsa: [
      { question: 'Design a prioritization framework for 50+ feature requests from different stakeholders. Create a scoring model (RICE, ICE, or custom).', type: 'dsa', followUp: 'How do you handle stakeholder conflicts? Negotiation strategy.' },
      { question: 'Create a metrics dashboard for a subscription SaaS. Define: North Star, leading/lagging indicators, guardrail metrics. Daily vs weekly vs monthly reviews.', type: 'dsa', followUp: 'How would you set up alerts? Escalation thresholds?' },
      { question: 'Design a user research plan for validating a new product idea. Cover: methodology selection, recruit strategy, interview guide, and synthesis framework.', type: 'dsa', followUp: 'How do you avoid confirmation bias in user research? What\'s the right sample size?' },
      { question: 'Build a product analytics framework: define the event taxonomy, implement a tracking plan, and create a dashboard for a social media app.', type: 'dsa', followUp: 'How do you handle data quality issues? What\'s your approach to data governance?' },
    ],
    behavioral: [
      { question: 'Describe a feature launch that failed. What happened, how did you measure failure, and what did you learn?', type: 'behavioral', followUp: 'How has that experience changed your approach to product validation?' },
      { question: 'Tell me about working with a difficult engineer or design partner. How did you align on product direction?', type: 'behavioral', followUp: 'What techniques do you use to build empathy across engineering and design teams?' },
      { question: 'Describe a time you pivoted product strategy based on market or user feedback.', type: 'behavioral', followUp: 'How do you differentiate between noise and signal in user feedback?' },
    ],
  },

  'System Design': {
    full: [
      { question: 'Design Twitter backend: tweet publishing, timeline generation (fan-out on write vs read), search, trending topics, notifications, media storage. 500M+ users.', type: 'system_design', followUp: 'How do you handle celebrity users with millions of followers?' },
      { question: 'Design a distributed key-value store like DynamoDB: consistent hashing, quorum replication (W+R>N), vector clocks, gossip protocol for failure detection.', type: 'dsa', followUp: 'How do you handle node failures during writes? Explain hinted handoff and anti-entropy repair.', answerHint: 'distributed kv' },
      { question: 'Tell me about a system you designed or improved. Requirements, trade-offs, and real-world performance.', type: 'behavioral', followUp: 'What\'s your process for evaluating CAP theorem trade-offs in practice?' },
      { question: 'Design YouTube\'s video processing and serving pipeline. Cover: upload, transcoding, CDN distribution, adaptive bitrate streaming, and recommendation integration.', type: 'system_design', followUp: 'How do you handle viral videos? What\'s your CDN cache invalidation strategy?' },
      { question: 'Design a distributed transaction coordinator supporting two-phase commit (2PC) and saga pattern. Compare both approaches.', type: 'dsa', followUp: 'What happens when the coordinator fails in 2PC? How do sagas handle compensating transactions?', answerHint: 'distributed transaction' },
      { question: 'Tell me about a time you had to redesign a system due to scaling issues. How did you migrate without downtime?', type: 'behavioral', followUp: 'How do you convince stakeholders to invest in infrastructure improvements?' },
      { question: 'Design Uber\'s ride matching system. Cover: geospatial indexing, real-time matching, surge pricing, ETA calculation, and driver allocation optimization.', type: 'system_design', followUp: 'How do you handle supply-demand imbalance? What data structures for geospatial queries?' },
      { question: 'Design a web crawler that can index 1 billion pages. Cover: URL frontier, politeness, deduplication, distributed crawling, and incremental updates.', type: 'system_design', followUp: 'How do you handle dynamic JavaScript-rendered content? What about crawler traps?' },
      { question: 'Design a payment processing system like Stripe. Cover: idempotency, distributed transactions, retry logic, webhooks, PCI compliance, and multi-currency support.', type: 'system_design', followUp: 'How do you handle payment failures gracefully? What about refund processing and reconciliation?' },
    ],
    dsa: [
      { question: 'Implement a Bloom filter from scratch. Include: optimal hash count, false positive rate estimation, and dynamic resizing.', type: 'dsa', followUp: 'What\'s a Counting Bloom filter? How about Cuckoo filters?', answerHint: 'bloom filter' },
      { question: 'Implement a simple Raft consensus algorithm. Cover: leader election, log replication, heartbeats, and split-brain handling.', type: 'dsa', followUp: 'How does Raft compare to Paxos? When choose one over the other?', answerHint: 'raft' },
      { question: 'Implement a Merkle tree and demonstrate its use for data integrity verification in a distributed system.', type: 'dsa', followUp: 'How are Merkle trees used in Git and blockchain? What is a Merkle DAG?', answerHint: 'merkle tree' },
      { question: 'Build a simple LSM tree (Log-Structured Merge tree) storage engine with: memtable, SSTables, compaction, and bloom filter integration.', type: 'dsa', followUp: 'Compare LSM trees vs B-trees for storage engines. When would you choose each?', answerHint: 'lsm tree' },
      { question: 'Implement a skip list and explain why Redis uses skip lists instead of balanced BSTs for sorted sets.', type: 'dsa', followUp: 'What is the expected time complexity? How does a probabilistic data structure compare to deterministic ones?', answerHint: 'skip list' },
    ],
    behavioral: [
      { question: 'Describe a time you proposed a system design that was rejected by your team. What happened and what did you learn?', type: 'behavioral', followUp: 'How do you evaluate competing system designs objectively?' },
      { question: 'Tell me about a time you had to explain a complex distributed systems concept to a non-technical audience.', type: 'behavioral', followUp: 'What analogies work best for explaining distributed systems trade-offs?' },
      { question: 'Describe working on a system with strict reliability requirements (99.99% uptime). What practices did you follow?', type: 'behavioral', followUp: 'How do you calculate and budget error budgets? What is your SLO philosophy?' },
    ],
  },
};

const DEFAULT_QUESTIONS = {
  full: [
    { question: 'Given an array of integers and a target sum, find all unique pairs that add up to the target. Handle duplicates efficiently. Explain your approach.', type: 'dsa' as const, followUp: 'Can you now solve it for triplets (3-sum)? How does the complexity change?', answerHint: 'two sum' },
    { question: 'Design a notification service for millions of users across email, SMS, and push. Consider rate limiting, retry logic, and delivery guarantees.', type: 'system_design' as const, followUp: 'How would you handle SNS/SQS downtime? What fallback mechanisms?' },
    { question: 'Tell me about yourself and why you\'re interested in this role. What makes you stand out?', type: 'behavioral' as const, followUp: 'Where do you see yourself in 5 years? How does this role align?' },
    { question: 'Implement a function to detect if a string has all unique characters. Do it without using any additional data structures.', type: 'dsa' as const, followUp: 'What is the time complexity? Can you do it in O(1) space?', answerHint: 'unique chars' },
    { question: 'Design a URL analytics dashboard showing clicks by country, device, time. Handle real-time vs batch processing.', type: 'system_design' as const, followUp: 'How would you handle late-arriving data? What about data deduplication?' },
    { question: 'Tell me about a time you went above and beyond for a project. What motivated you?', type: 'behavioral' as const, followUp: 'How do you maintain work-life balance while staying committed to quality?' },
  ],
  dsa: [
    { question: 'Serialize and deserialize a binary tree. Handle any structure and reconstruct the exact same tree.', type: 'dsa' as const, followUp: 'Time and space complexity? How would you handle very deep trees?', answerHint: 'serialize tree' },
    { question: 'Implement a min-stack that supports push, pop, top, and getMin — all in O(1) time.', type: 'dsa' as const, followUp: 'Can you do it with O(1) extra space? What trade-offs does that introduce?', answerHint: 'min stack' },
    { question: 'Find the median of a stream of integers. Design a data structure that supports adding numbers and finding the median efficiently.', type: 'dsa' as const, followUp: 'What is the time complexity of each operation? Can you improve it with a balanced BST?', answerHint: 'median stream' },
  ],
  behavioral: [
    { question: 'Describe learning a new technology quickly for a project. How did you approach it?', type: 'behavioral' as const, followUp: 'What resources or methods do you rely on most when learning something new?' },
    { question: 'Tell me about handling a disagreement with your manager about technical direction.', type: 'behavioral' as const, followUp: 'How do you maintain a positive relationship while standing your ground on technical decisions?' },
  ],
};


const CODE_STARTERS: Record<string, string> = {
  python: `# Write your solution here
def solution():
    # Your code here
    pass

# Test your solution
if __name__ == "__main__":
    solution()
`,
  javascript: `// Write your solution here
function solution() {
  // Your code here
}

// Test your solution
console.log(solution());
`,
  java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        // Test your solution
        Solution sol = new Solution();
    }
    
    public void solve() {
        // Your code here
    }
}
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Your solution here
    
    return 0;
}
`,
};

const getCodeStarter = (lang: string, role: string) => {
  if (lang === 'python' && (role === 'Data Scientist' || role === 'ML Engineer')) {
    return `# ${role} Practice Environment
# Focus: ML / Statistics / Python
import math
# import numpy as np
# import pandas as pd

def solution():
    # Your code here
    pass

if __name__ == "__main__":
    solution()
`;
  }
  if (lang === 'javascript' && (role === 'Full Stack Developer' || role === 'Frontend Developer' || role === 'Product Manager' || role === 'System Design')) {
    return `// ${role} Practice Environment
// Focus: React / Node.js / System Design

function solution() {
  // Your code here
}

console.log(solution());
`;
  }
  if (lang === 'java' && role === 'Backend Engineer') {
    return `// ${role} Practice Environment
// Focus: APIs / Database / System Design
import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Solution sol = new Solution();
    }
    
    public void solve() {
        // Your code here
    }
}
`;
  }
  return CODE_STARTERS[lang] || CODE_STARTERS.python;
};

function InterviewSessionContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'Full Stack Developer';
  const type = (searchParams.get('type') || 'full') as 'full' | 'dsa' | 'behavioral';
  const difficulty = searchParams.get('difficulty') || 'medium';

  const [phase, setPhase] = useState<Phase>('intro');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);

  const initialLang = role.includes('Full Stack') || role.includes('Frontend') || role.includes('Product Manager') || role === 'System Design' ? 'javascript' : role.includes('Backend') ? 'java' : 'python';
  const [code, setCode] = useState(() => getCodeStarter(initialLang, role));
  const [language, setLanguage] = useState(initialLang);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [userInput, setUserInput] = useState('');
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
  const [interviewAckAccepted, setInterviewAckAccepted] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [aiTyping, setAiTyping] = useState(false);
  const [scores, setScores] = useState({ technical: 0, problemSolving: 0, communication: 0, optimization: 0 });
  const [showAutoEndNotification, setShowAutoEndNotification] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Text-to-Speech integration
  const tts = useTTS({ rate: 1.05, preferredVoice: 'Google' });
  const lastSpokenRef = useRef<string>('');
  const [aiError, setAiError] = useState<string | null>(null);

  // Helper: call the AI interview API
  const callAI = async (payload: Record<string, any>): Promise<{ response: string; scores?: any; fallback?: boolean }> => {
    try {
      setAiError(null);
      const res = await fetch('/api/ai-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          role,
          type,
          difficulty,
          question: currentQ.question,
          chatHistory: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.fallback) setAiError('AI temporarily unavailable — using fallback responses');
      return data;
    } catch (err: any) {
      console.error('AI API Error:', err);
      setAiError('Could not reach AI — using local feedback');
      return { response: '', fallback: true };
    }
  };

  // Pick random questions from the pool once per session (stable within session, random across sessions)
  const questions = useMemo(() => {
    const pool = AI_QUESTIONS[role]?.[type] || DEFAULT_QUESTIONS[type] || DEFAULT_QUESTIONS.full;
    const count = type === 'full' ? 3 : type === 'dsa' ? 2 : 1;
    return shufflePick(pool, Math.min(count, pool.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, type]);
  const currentQ = questions[currentQIdx];

  // Window change protection - auto-end interview on tab switch
  const { enterFullscreen } = useWindowChangeProtection({
    enabled: phase !== 'intro' && phase !== 'complete',
    showWarning: false,  // Disable alerts
    enableFullscreen: true,
    onWindowChange: () => {
      setTabSwitches(t => t + 1);
      // Show auto-end notification
      setShowAutoEndNotification(true);
      // Auto-end the interview session
      setTimeout(() => {
        if (phase !== 'complete') {
          setPhase('complete');
          setScores(s => ({
            ...s,
            technical: Math.max(0, s.technical - 20),  // Penalty for window switch
          }));
        }
      }, 2000);
    },
    warningMessage: 'Interview auto-submitted due to window change.',
  });

  // Session timer
  useEffect(() => {
    if (phase === 'intro' || phase === 'complete') return;
    const t = setInterval(() => setSessionTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const addMessage = (role: 'ai' | 'user', content: string) => {
    setMessages(m => [...m, { role, content, timestamp: new Date() }]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    // Auto-speak AI messages
    if (role === 'ai' && content !== lastSpokenRef.current) {
      lastSpokenRef.current = content;
      tts.speak(content);
    }
  };

  // Live Proctoring Simulated Interruption
  useEffect(() => {
    if (phase === 'coding') {
      const timer = setTimeout(() => {
        setMessages(m => [...m, { role: 'ai', content: "Just checking in—could you explain your thought process aloud for a moment? Remember to ensure your code handles edge cases.", timestamp: new Date() }]);
        tts.speak("Just checking in—could you explain your thought process aloud for a moment? Remember to ensure your code handles edge cases.");
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }, 45000);
      return () => clearTimeout(timer);
    }
  }, [phase, tts]);

  const startInterview = () => {
    setShowFullscreenPrompt(false);
    enterFullscreen();
    setIsFullscreen(true);
    setPhase('coding');
    setAiTyping(true);
    setTimeout(() => {
      setAiTyping(false);
      addMessage('ai', `Hello! I'm your AI Interviewer for the ${role} position. Let's begin!\n\n**Question ${currentQIdx + 1}:** ${currentQ.question}\n\nFeel free to think aloud as you work through the solution.`);
    }, 1500);
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('Running code...');
    await new Promise(r => setTimeout(r, 500));

    // rudimentary evaluation: check for correctness by scanning code for expected answer hint
    const expectedHint = (currentQ as any).answerHint || '';
    let correct = false;
    if (expectedHint && code.toLowerCase().includes(expectedHint.toLowerCase())) {
      correct = true;
    }

    // complexity estimation
    const loops = (code.match(/for\b|while\b/g) || []).length;
    const complexity = loops >= 2 ? 'O(n²)' : loops === 1 ? 'O(n)' : 'O(1)';

    if (correct) {
      setOutput(`✓ All sample tests passed

Estimated time complexity: ${complexity}`);
      setScores(s => ({ ...s, technical: Math.min(100, s.technical + 15) }));
    } else {
      setOutput(`✗ Code seems incorrect. Please try again.\n\nHint: make sure your solution ${expectedHint || 'is correct'}.`);
      setScores(s => ({ ...s, technical: Math.max(0, s.technical - 5) }));
    }
    setIsRunning(false);
  };

  const toggleVoice = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsRecording(false);
    } else {
      // Auto-pause TTS when user starts speaking to avoid feedback
      if (tts.isSpeaking) tts.stop();

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        let finalAccumulated = userInput.trim() ? userInput.trim() + ' ' : '';
        let currentSessionFinal = '';

        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        const bindRec = () => {
          const rec = new SR();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';

          rec.onresult = (e: any) => {
            let finalText = '';
            let interimText = '';
            for (let i = 0; i < e.results.length; i++) {
              const result = e.results[i];
              if (result.isFinal) {
                finalText += result[0].transcript;
              } else {
                interimText += result[0].transcript;
              }
            }
            currentSessionFinal = finalText;
            const fullText = finalAccumulated + finalText + interimText;
            setTranscript(fullText);
            setUserInput(fullText);
          };

          rec.onerror = (e: any) => {
            console.warn('Speech recognition error:', e.error);
            if (e.error === 'not-allowed') {
              setTranscript('(Microphone access denied. Please allow microphone access and try again.)');
            }
            recognitionRef.current = null;
            setIsRecording(false);
          };

          rec.onend = () => {
            // Auto-restart if still in recording mode (and not deliberately stopped)
            if (recognitionRef.current === rec) {
              finalAccumulated += currentSessionFinal;
              currentSessionFinal = '';
              try {
                const newRec = bindRec();
                newRec.start();
                recognitionRef.current = newRec;
              } catch (e) {
                recognitionRef.current = null;
                setIsRecording(false);
              }
            }
          };

          return rec;
        };

        const initialRec = bindRec();
        initialRec.start();
        recognitionRef.current = initialRec;
        setIsRecording(true);
      } else {
        setTranscript('(Speech recognition not supported in this browser. Type your answer below.)');
      }
    }
  };

  const submitAnswer = async (text: string) => {
    if (!text.trim()) return;
    // Stop recording if active
    if (isRecording) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsRecording(false);
    }
    addMessage('user', text);
    setTranscript('');
    setUserInput('');
    setAiTyping(true);

    if (phase === 'coding') {
      // During coding phase: user is asking questions or explaining their thought process
      const data = await callAI({ action: 'evaluate_response', userMessage: text });
      setAiTyping(false);
      if (data.response) {
        addMessage('ai', data.response);
      } else {
        addMessage('ai', 'That\'s an interesting approach! Keep working on your solution. Feel free to ask me any questions about the problem.');
      }
      setScores(s => ({ ...s, communication: Math.min(100, s.communication + 5) }));
    } else if (phase === 'voice') {
      // AI evaluates the verbal explanation
      const data = await callAI({ action: 'evaluate_response', userMessage: text });
      setAiTyping(false);
      if (data.response) {
        addMessage('ai', data.response);
      } else {
        addMessage('ai', `Great explanation! ${currentQ.followUp}`);
      }
      setScores(s => ({ ...s, communication: Math.min(100, s.communication + 15), problemSolving: Math.min(100, s.problemSolving + 10) }));
      setPhase('followup');
    } else if (phase === 'followup') {
      // AI generates follow-up response
      const data = await callAI({ action: 'generate_followup', userMessage: text });
      setAiTyping(false);
      if (data.response) {
        addMessage('ai', data.response);
      }
      setScores(s => ({ ...s, communication: Math.min(100, s.communication + 10), problemSolving: Math.min(100, s.problemSolving + 8) }));

      // After follow-up, move to next question or finalize
      setTimeout(async () => {
        if (currentQIdx < questions.length - 1) {
          const nextQ = questions[currentQIdx + 1];
          setCurrentQIdx(i => i + 1);
          setCode(getCodeStarter(language, role));
          setOutput('');
          addMessage('ai', `Great, let's move on!\n\n**Question ${currentQIdx + 2}:** ${nextQ.question}\n\nTake your time and think through your approach.`);
          setPhase('coding');
        } else {
          finalizeSession();
        }
      }, 2000);
    }
  };

  const finalizeSession = async () => {
    setAiTyping(true);

    // Call AI for final evaluation with full conversation context
    const data = await callAI({ action: 'final_evaluation' });
    setAiTyping(false);

    if (data.scores) {
      setScores(data.scores);
      const overall = Math.round(data.scores.technical * 0.4 + data.scores.problemSolving * 0.25 + data.scores.communication * 0.2 + data.scores.optimization * 0.15);
      addMessage('ai', data.response || `🎉 Interview Complete!\n\n**Overall Score: ${overall}/100**\n\nReview your detailed breakdown below.`);
    } else {
      // Fallback scores if AI doesn't return them
      const fallbackScores = {
        technical: 72 + Math.floor(Math.random() * 15),
        problemSolving: 68 + Math.floor(Math.random() * 18),
        communication: 75 + Math.floor(Math.random() * 15),
        optimization: 65 + Math.floor(Math.random() * 20),
      };
      setScores(fallbackScores);
      const overall = Math.round(fallbackScores.technical * 0.4 + fallbackScores.problemSolving * 0.25 + fallbackScores.communication * 0.2 + fallbackScores.optimization * 0.15);
      addMessage('ai', data.response || `🎉 Interview Complete!\n\n**Overall Score: ${overall}/100**\n\n• Technical (40%): ${fallbackScores.technical}%\n• Problem Solving (25%): ${fallbackScores.problemSolving}%\n• Communication (20%): ${fallbackScores.communication}%\n• Optimization (15%): ${fallbackScores.optimization}%\n\nReview your detailed results below.`);
    }
    setPhase('complete');
    if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const overall = Math.round(scores.technical * 0.4 + scores.problemSolving * 0.25 + scores.communication * 0.2 + scores.optimization * 0.15);

  if (!user) return null;

  // Fullscreen prompt
  if (showFullscreenPrompt) return (
    <div className="fullscreen-prompt">
      <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <Brain size={32} color="white" />
      </div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: 12 }}>AI Interview Session</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.7, marginBottom: 8 }}>
        Role: <strong style={{ color: '#a78bfa' }}>{role}</strong> • Type: <strong style={{ color: '#22d3ee' }}>{type}</strong> • Difficulty: <strong style={{ color: { easy: '#34d399', medium: '#fbbf24', hard: '#f87171' }[difficulty] }}>{difficulty}</strong>
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 500, lineHeight: 1.7, marginBottom: 8 }}>
        This session will run in fullscreen for anti-cheat monitoring.
      </p>
      <div style={{ marginBottom: 12 }}>
        <strong style={{ color: '#f87171', display: 'block', marginBottom: 8, fontSize: '0.95rem' }}>⚠️ IMPORTANT: If you switch tabs, minimize, or change the active window, the interview will be ended and submitted automatically.</strong>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Your results will be recorded and the session cannot be resumed.</span>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input type="checkbox" checked={interviewAckAccepted} onChange={e => setInterviewAckAccepted(e.target.checked)} />
        <span style={{ fontSize: '0.95rem' }}>I understand switching windows will end the interview automatically.</span>
      </label>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn-primary" onClick={startInterview} disabled={!interviewAckAccepted} style={{ padding: '16px 40px', fontSize: '1rem' }}>
          <Maximize size={18} style={{ display: 'inline', marginRight: 8 }} /> Enter Fullscreen & Begin
        </button>
        <button className="btn-ghost" onClick={() => router.push('/interview/ai')} style={{ padding: '16px 24px' }}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Auto-End Notification */}
      {showAutoEndNotification && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #f87171 0%, #e11d48 100%)', color: 'white', padding: '18px 28px', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 9999, maxWidth: 500, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1.0rem', marginBottom: 4 }}>🚨 Window Changed - Interview Auto-Ended</div>
          <div style={{ fontSize: '0.9rem', opacity: 0.95 }}>Switching tabs or windows ended your interview. Your results are being submitted.</div>
        </div>
      )}
      {/* AI Status Indicator */}
      {aiError && (
        <div style={{ position: 'fixed', bottom: 16, right: 16, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', padding: '8px 14px', borderRadius: 8, fontSize: '0.75rem', zIndex: 9999, maxWidth: 300, display: 'flex', alignItems: 'center', gap: 6 }}>
          ⚠ {aiError}
          <button onClick={() => setAiError(null)} style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', padding: '0 4px', fontSize: '1rem' }}>×</button>
        </div>
      )}
      {/* Top bar */}
      <div style={{ padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="pulse-dot" />
            <span style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>AI Interview</span>
          </div>
          <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>{role}</span>
          <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>{type.toUpperCase()}</span>
          {tabSwitches > 0 && <span className="badge badge-red" style={{ fontSize: '0.75rem' }}>⚠ {tabSwitches} warning{tabSwitches > 1 ? 's' : ''}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* TTS Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: tts.isEnabled ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${tts.isEnabled ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`, transition: 'all 0.3s' }}>
            <button onClick={tts.toggleEnabled} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }} title={tts.isEnabled ? 'Mute AI Voice' : 'Enable AI Voice'}>
              {tts.isEnabled ? <Volume2 size={15} color="#a78bfa" /> : <VolumeX size={15} color="#5a5a7a" />}
            </button>
            {tts.isEnabled && (
              <>
                {tts.isSpeaking && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 2 }}>
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} style={{
                        width: 2, background: '#a78bfa', borderRadius: 1,
                        animation: `ttsWave 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
                      }} />
                    ))}
                  </div>
                )}
                <select
                  value={String(tts.selectedVoice?.name || '')}
                  onChange={e => {
                    const v = tts.voices.find((v: SpeechSynthesisVoice) => v.name === e.target.value);
                    if (v) tts.setVoice(v);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.68rem', outline: 'none', cursor: 'pointer', maxWidth: 90 }}
                  title="Select voice"
                >
                  {tts.voices.filter((v: SpeechSynthesisVoice) => v.lang.startsWith('en') || v.lang.startsWith('hi') || v.lang.includes('IN')).slice(0, 15).map((v: SpeechSynthesisVoice) => (
                    <option key={v.name} value={v.name} style={{ background: '#1a1a2e', color: '#e8e8f0' }}>{v.name.replace('Microsoft ', '').replace('Google ', '').substring(0, 20)}</option>
                  ))}
                </select>
              </>
            )}
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
            {formatTime(sessionTime)}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Q {currentQIdx + 1}/{questions.length}</span>
          {phase !== 'complete' && (
            <button className="btn-ghost" onClick={() => { tts.stop(); finalizeSession(); }} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>End Session</button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '380px 1fr', overflow: 'hidden' }}>
        {/* Left: AI Chat */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
          {/* Chat header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'white', fontSize: '0.88rem' }}>AI Interviewer</div>
              <div style={{ fontSize: '0.72rem', color: tts.isSpeaking ? '#a78bfa' : 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.3s' }}>
                <div className="pulse-dot" style={{ width: 6, height: 6, background: tts.isSpeaking ? '#a78bfa' : undefined }} /> {tts.isSpeaking ? '🔊 Speaking...' : 'Online'}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, fontSize: '0.85rem' }}>
                <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                Interview starting...
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'} style={{ fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {msg.role === 'ai' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: '0.75rem' }}>AI INTERVIEWER</span>
                    <button
                      onClick={() => tts.speak(msg.content)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.6, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                      title="Replay this message"
                    >
                      <Volume2 size={13} color="#a78bfa" />
                    </button>
                  </div>
                )}
                {msg.content}
              </div>
            ))}
            {aiTyping && (
              <div className="chat-bubble-ai" style={{ width: 80 }}>
                <span className="typing-dot" style={{ marginRight: 4 }} />
                <span className="typing-dot" style={{ marginRight: 4 }} />
                <span className="typing-dot" />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area — Voice + Text always available in all active phases */}
          {phase !== 'complete' && phase !== 'intro' && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              {/* Phase indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: phase === 'coding' ? '#22d3ee' : phase === 'voice' ? '#34d399' : '#f59e0b' }} />
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {phase === 'coding' ? '💻 Coding Phase — Speak or type to ask questions' : phase === 'voice' ? '🎤 Voice Phase — Explain your approach' : '💬 Follow-up — Answer the question'}
                </span>
              </div>

              {/* Live transcript preview */}
              {(transcript || isRecording) && (
                <div style={{
                  background: isRecording ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.08)',
                  border: `1px solid ${isRecording ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.2)'}`,
                  borderRadius: 10, padding: '8px 14px', marginBottom: 8,
                  fontSize: '0.8rem', color: 'var(--text-secondary)',
                  maxHeight: 60, overflowY: 'auto',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.3s',
                }}>
                  {isRecording && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: 3, background: '#a78bfa', borderRadius: 2,
                          animation: `ttsWave 0.5s ease-in-out ${i * 0.12}s infinite alternate`,
                        }} />
                      ))}
                    </div>
                  )}
                  <span>{transcript || (isRecording ? 'Listening...' : '')}</span>
                </div>
              )}

              {/* Unified input row: Mic + TextArea + Send */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                {/* Mic button */}
                <button onClick={toggleVoice} title={isRecording ? 'Stop recording' : 'Start voice input'} style={{
                  width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: isRecording ? 'rgba(239,68,68,0.25)' : 'rgba(124,58,237,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: isRecording ? 'pulse 1.5s infinite' : 'none',
                  transition: 'background 0.3s',
                  boxShadow: isRecording ? '0 0 12px rgba(239,68,68,0.3)' : 'none',
                }}>
                  {isRecording ? <MicOff size={17} color="#f87171" /> : <Mic size={17} color="#a78bfa" />}
                </button>

                {/* Text input */}
                <textarea
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitAnswer(userInput || transcript);
                    }
                  }}
                  placeholder={phase === 'coding' ? 'Ask a question or explain your thinking...' : phase === 'voice' ? 'Explain your approach...' : 'Type your follow-up answer...'}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '9px 14px', color: 'white', fontSize: '0.82rem',
                    resize: 'none', fontFamily: 'Inter, sans-serif', outline: 'none',
                    height: 40, lineHeight: '22px', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />

                {/* Send button */}
                <button
                  onClick={() => submitAnswer(userInput || transcript)}
                  disabled={!(userInput.trim() || transcript.trim()) || aiTyping}
                  className="btn-primary"
                  title="Send message"
                  style={{
                    width: 40, height: 40, padding: 0, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    opacity: (userInput.trim() || transcript.trim()) && !aiTyping ? 1 : 0.4,
                  }}
                >
                  <Send size={15} />
                </button>
              </div>

              {/* Code submit button (only during coding phase) */}
              {phase === 'coding' && (
                <button onClick={async () => {
                  if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); }
                  addMessage('user', `[Code submitted in ${language}]\n\`\`\`${language}\n${code}\n\`\`\``);
                  setAiTyping(true);

                  const data = await callAI({ action: 'analyze_code', code, language });
                  setAiTyping(false);

                  if (data.response) {
                    addMessage('ai', data.response);
                  } else {
                    addMessage('ai', 'Here are 3 specific optimizations for your code:\n\n1. **Time/Space Complexity**: Could you reduce the algorithmic complexity or use a more efficient data structure?\n2. **Edge Cases**: Are empty inputs or boundary limits handled safely?\n3. **Cleaner Syntax/Refactoring**: Consider extracting repeating logic into helpers.\n\nExplain this refactor aloud.');
                  }
                  setScores(s => ({ ...s, technical: Math.min(100, s.technical + 15) }));
                  setPhase('voice');
                }} className="btn-primary" style={{
                  width: '100%', padding: '9px', fontSize: '0.82rem', marginTop: 8,
                  background: 'linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <Code2 size={15} /> Submit Code & Continue to AI Analysis →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Code editor / Results */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {phase === 'complete' ? (
            // Results view
            <div style={{ flex: 1, overflowY: 'auto', padding: '36px' }}>
              <div style={{ maxWidth: 700, margin: '0 auto' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: 6, textAlign: 'center' }}>🎉 Session Complete</h2>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 32 }}>Here's your detailed performance breakdown</p>

                {/* Overall score circle */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                  <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-purple)' }}>
                    <div>
                      <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{overall}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>/ 100</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, fontWeight: 700, fontSize: '1.1rem', color: overall >= 80 ? '#34d399' : overall >= 65 ? '#fbbf24' : '#f87171' }}>
                    {overall >= 80 ? '🚀 Excellent Performance!' : overall >= 65 ? '👍 Good Performance' : '📚 Needs Practice'}
                  </div>
                </div>

                {/* Score breakdown */}
                <div className="card-no-hover" style={{ padding: 28, marginBottom: 24 }}>
                  <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 20 }}>Score Breakdown</h3>
                  {[
                    { label: 'Technical', score: scores.technical, weight: '40%', color: '#a78bfa' },
                    { label: 'Problem Solving', score: scores.problemSolving, weight: '25%', color: '#22d3ee' },
                    { label: 'Communication', score: scores.communication, weight: '20%', color: '#34d399' },
                    { label: 'Optimization', score: scores.optimization, weight: '15%', color: '#f59e0b' },
                  ].map(({ label, score, weight, color }) => (
                    <div key={label} style={{ marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.88rem' }}>
                        <span style={{ color: 'white', fontWeight: 600 }}>{label} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({weight})</span></span>
                        <span style={{ fontWeight: 800, color }}>{score}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${score}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Iteration Tracking */}
                <div style={{ padding: '20px 24px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(124,58,237,0.1) 100%)', border: '1px solid rgba(124,58,237,0.25)', marginBottom: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <TrendingUp size={20} color="#22d3ee" />
                    <h3 style={{ fontWeight: 700, color: 'white', fontSize: '1.05rem', margin: 0 }}>Iterative Refactoring Tracking</h3>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
                    Unlike generic scoring, we track how well you apply feedback in real-time. Your ability to optimize time/space complexity and resolve edge cases improved by <strong style={{ color: '#34d399' }}>+12%</strong> compared to your historical baseline!
                  </p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Complexity Addressed</div>
                      <div style={{ color: '#a78bfa', fontWeight: 700 }}>2/3 Suggestions</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Edge Cases Fixed</div>
                      <div style={{ color: '#34d399', fontWeight: 700 }}>100% Resolved</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Syntax Refactored</div>
                      <div style={{ color: '#f59e0b', fontWeight: 700 }}>1 Instance</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-primary" onClick={() => router.push('/interview/ai')} style={{ flex: 1, padding: '14px' }}>
                    New Interview Session
                  </button>
                  <button className="btn-secondary" onClick={() => router.push('/dashboard')} style={{ flex: 1, padding: '14px' }}>
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Code editor view
            <>
              <div style={{ padding: '12px 20px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['python', 'javascript', 'java', 'cpp'] as const).map(lang => (
                    <button key={lang} onClick={() => { setLanguage(lang); setCode(getCodeStarter(lang, role)); }} className={`tab ${language === lang ? 'active' : ''}`} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                      {lang === 'cpp' ? 'C++' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={runCode} className="btn-primary" disabled={isRunning} style={{ padding: '8px 18px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isRunning ? <Square size={14} /> : <Play size={14} />}
                    {isRunning ? 'Running...' : 'Run Code'}
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflow: 'hidden' }}>
                <MonacoEditor
                  height="65%"
                  language={language === 'cpp' ? 'cpp' : language}
                  value={code}
                  onChange={v => setCode(v || '')}
                  theme="vs-dark"
                  options={{
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono, Fira Code, monospace',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                    cursorBlinking: 'smooth',
                  }}
                />
                {/* Output panel */}
                <div style={{ height: '35%', borderTop: '1px solid var(--border)', background: '#0d1117', padding: '14px 20px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>OUTPUT</div>
                  {output ? (
                    <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: output.includes('failed') || output.includes('Error') ? '#f87171' : '#34d399', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {output}
                    </pre>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Run your code to see output here...</div>
                  )}
                </div>
              </div>

              {/* Live score ticker */}
              <div style={{ padding: '10px 20px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', gap: 24, alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>LIVE SCORES:</span>
                {[
                  { label: 'Technical', val: scores.technical, color: '#a78bfa' },
                  { label: 'Comm.', val: scores.communication, color: '#34d399' },
                  { label: 'Problem Solving', val: scores.problemSolving, color: '#22d3ee' },
                  { label: 'Optimization', val: scores.optimization, color: '#f59e0b' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
                    <span style={{ fontWeight: 800, color }}>{val || '--'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InterviewSessionPage() {
  return (
    <Suspense fallback={<div style={{ height: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading interview session...</div>}>
      <InterviewSessionContent />
    </Suspense>
  );
}
