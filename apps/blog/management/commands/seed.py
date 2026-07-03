from django.core.management.base import BaseCommand
from apps.users.models import User
from apps.blog.models import Post, Tag
from django.utils import timezone
from datetime import datetime, timezone as dt_timezone

class Command(BaseCommand):
    help = 'Seeds the database with high-quality authentic engineering posts'

    def handle(self, *args, **options):
        # 1. Ensure demo user exists
        if not User.objects.filter(email='demo@example.com').exists():
            user = User.objects.create_user(email='demo@example.com', password='DemoPass123')
            user.profile.bio = 'Senior Software Engineer & Systems Architect'
            user.profile.save()
            self.stdout.write('Created demo user.')
        else:
            user = User.objects.get(email='demo@example.com')

        # 2. Get or create tags
        t_redis, _ = Tag.objects.get_or_create(name='redis')
        t_python, _ = Tag.objects.get_or_create(name='python')
        t_postgres, _ = Tag.objects.get_or_create(name='postgresql')
        t_db, _ = Tag.objects.get_or_create(name='database')
        t_ai, _ = Tag.objects.get_or_create(name='ai-agents')
        t_systems, _ = Tag.objects.get_or_create(name='systems')
        t_react, _ = Tag.objects.get_or_create(name='react')
        t_frontend, _ = Tag.objects.get_or_create(name='frontend')
        t_devops, _ = Tag.objects.get_or_create(name='devops')
        t_docker, _ = Tag.objects.get_or_create(name='docker')
        t_security, _ = Tag.objects.get_or_create(name='security')
        t_django, _ = Tag.objects.get_or_create(name='django')
        t_llm, _ = Tag.objects.get_or_create(name='llm')

        # Define the authentic posts
        posts_data = [
            {
                'title': 'Designing Concurrent Task Queues with Redis and Python',
                'content': '''In distributed systems, offloading heavy, non-blocking tasks from the main request-response cycle is crucial for maintaining low latency. While heavy frameworks like Celery are the industry standard, they often introduce significant complexity. In this article, we'll build a lightweight, concurrent task queue from scratch using Redis and Python's `asyncio` library.

### Why Redis?

Redis is exceptionally fast because it operates entirely in memory. It provides atomic list operations like `LPUSH` and `BRPOPLPUSH`, which are ideal for building reliable queue patterns.

### The Reliable Queue Pattern

A common pitfall of simple queues is the "lost task" problem: if a worker pulls a task and crashes immediately, that task is lost forever. To prevent this, we use the **Reliable Queue Pattern** (also known as the two-list pattern).

We use `RPOPLPUSH` (or its blocking variant `BRPOPLPUSH`) to atomically pop a task from the main queue and push it onto a "processing" list. Once the worker successfully finishes the task, it removes the item from the processing list. If the worker dies, a sweeper process can reclaim tasks left in the processing list.

### Implementing the Worker in Python

Here is a complete, runnable example of an asynchronous worker:

```python
import asyncio
import redis.asyncio as aioredis

REDIS_URL = "redis://localhost:6379"
QUEUE_NAME = "tasks:main"
PROCESSING_QUEUE = "tasks:processing"

async def process_task(task_id: str):
    print(f"Starting task {task_id}...")
    await asyncio.sleep(2)  # Simulate heavy I/O or CPU work
    print(f"Finished task {task_id}")

async def worker_loop():
    client = aioredis.from_url(REDIS_URL)
    print("Worker started. Waiting for tasks...")
    
    while True:
        # BRPOPLPUSH blocks until an item is available
        # It atomically moves the item from main queue to processing queue
        _, task_id_bytes = await client.brpoplpush(QUEUE_NAME, PROCESSING_QUEUE, timeout=0)
        task_id = task_id_bytes.decode('utf-8')
        
        try:
            await process_task(task_id)
            # Task succeeded, remove it from the processing queue
            await client.lrem(PROCESSING_QUEUE, 1, task_id)
        except Exception as e:
            print(f"Error processing task {task_id}: {e}")
            # Task failed, you can re-queue it or log it
            # await client.lpush(QUEUE_NAME, task_id)
            # await client.lrem(PROCESSING_QUEUE, 1, task_id)

if __name__ == "__main__":
    asyncio.run(worker_loop())
```

### Scaling to 10,000 Tasks Per Second

To scale this queue:
1. **Connection Pooling**: Always reuse Redis connections via a pool.
2. **Multiple Workers**: Run multiple instances of the worker script across different CPU cores or containers.
3. **Redis Pipeline**: When enqueueing tasks in bulk, use Redis pipelines to minimize round-trip times (RTT).''',
                'published_at': datetime(2025, 10, 14, 10, 0, 0, tzinfo=dt_timezone.utc),
                'likes_count': 142,
                'view_count': 1250,
                'tags': [t_redis, t_python, t_systems],
                'featured': True
            },
            {
                'title': 'Optimizing PostgreSQL Query Performance: A Case Study on Indexes',
                'content': '''A database-heavy application often starts fast but degrades as data grows. Most query performance issues stem from incorrect indexing or N+1 queries. In this article, we'll walk through diagnosing and optimizing a slow PostgreSQL query using real-world scenarios.

### Step 1: Diagnose with EXPLAIN ANALYZE

Never guess why a query is slow. Always start by prefixing the query with `EXPLAIN ANALYZE`. This tells PostgreSQL to execute the query and output the execution plan, showing exactly where time was spent.

```sql
EXPLAIN ANALYZE
SELECT * FROM blog_post 
WHERE status = 'published' AND published_at > '2025-01-01'
ORDER BY published_at DESC;
```

Look out for **Seq Scan** (Sequential Scan). A sequential scan means PostgreSQL had to read every single row on disk to find matches, which is extremely slow for large tables.

### Step 2: Designing the Optimal Index

To fix the sequential scan, we need an index. But a naive index on `published_at` might not be enough if we also filter by `status`. We should design a **composite index**:

```sql
CREATE INDEX idx_posts_status_published ON blog_post (status, published_at DESC);
```

#### The Order of Columns Matters
When creating composite indexes, follow the **Equality-Range Rule**:
1. Put columns filtered by equality (`status = 'published'`) first.
2. Put columns filtered by ranges (`published_at > '2025-01-01'`) or used in sorting (`ORDER BY`) second.

### Step 3: Fixing N+1 Queries in Django's ORM

Even with perfect indexes, your application can still be slow if it makes hundreds of unnecessary queries. The classic N+1 problem occurs when fetching a list of items and then querying related data for each item.

*Slow Code:*
```python
# This makes 1 query to fetch posts, then 1 query per post to fetch the author!
posts = Post.objects.filter(status='published')
for post in posts:
    print(post.author.email)
```

*Optimized Code:*
```python
# This performs a SQL JOIN and fetches the author data in a single query!
posts = Post.objects.filter(status='published').select_related('author')
for post in posts:
    print(post.author.email)
```

By combining composite indexes and `select_related`/`prefetch_related`, you can easily reduce page load times from seconds to milliseconds.''',
                'published_at': datetime(2026, 1, 8, 14, 30, 0, tzinfo=dt_timezone.utc),
                'likes_count': 189,
                'view_count': 1940,
                'tags': [t_postgres, t_db, t_systems],
                'featured': True
            },
            {
                'title': 'Demystifying Multi-Agent Orchestration: Designing Cognitive Loops',
                'content': '''Multi-agent systems are the next frontier in software automation. However, pulling in massive frameworks can make debugging nearly impossible. In this guide, we'll design a clean, framework-free cognitive loop that orchestrates three distinct agents to collaborate on a software task.

### The Architecture: Router, Executor, and Critic

Instead of letting agents talk randomly, we enforce a structured topology:
1. **Router**: Analyzes the user request and breaks it down into distinct sub-tasks.
2. **Executor**: Solves the specific sub-tasks.
3. **Critic**: Reviews the executor's output against safety and quality guidelines, providing feedback if revisions are needed.

```mermaid
graph TD
    User --> Router
    Router --> Executor
    Executor --> Critic
    Critic -->|Revision Needed| Executor
    Critic -->|Approved| User
```

### Implementing the Orchestrator

Here is a simplified Python orchestrator showing how state is passed between agents:

```python
class Agent:
    def __init__(self, name, system_prompt):
        self.name = name
        self.system_prompt = system_prompt

    def run(self, message_history):
        # In a real implementation, call your LLM client here
        # response = client.chat.completions.create(...)
        return f"[{self.name} Response to history]"

class CognitiveLoop:
    def __init__(self):
        self.executor = Agent("Executor", "Write clean Python code.")
        self.critic = Agent("Critic", "Review code for security vulnerabilities.")

    def execute_task(self, task_description):
        history = [{"role": "user", "content": task_description}]
        
        # Iterate up to 3 times to prevent infinite loops
        for iteration in range(3):
            print(f"\\n--- Iteration {iteration + 1} ---")
            
            # 1. Executor generates code
            code_output = self.executor.run(history)
            print(f"Executor Output: {code_output}")
            history.append({"role": "assistant", "content": code_output})
            
            # 2. Critic reviews code
            feedback = self.critic.run(history)
            print(f"Critic Feedback: {feedback}")
            
            if "APPROVED" in feedback.upper():
                print("Task completed successfully!")
                return code_output
                
            # If not approved, add feedback to history and let Executor try again
            history.append({"role": "user", "content": f"Feedback: {feedback}. Please revise."})
            
        raise Exception("Failed to reach consensus within iteration limit.")
```

### Handling Infinite Loops

The most critical challenge in multi-agent orchestration is the **infinite loop**: where the Executor and Critic disagree indefinitely. To mitigate this:
- **Strict Iteration Limits**: Always cap the maximum execution loops.
- **Decaying Temperature**: Reduce the LLM temperature on successive attempts to force deterministic, corrective behavior.
- **Human-in-the-loop (HITL)**: Inject a human approval step if consensus is not reached after N loops.''',
                'published_at': datetime(2026, 4, 3, 9, 15, 0, tzinfo=dt_timezone.utc),
                'likes_count': 256,
                'view_count': 2480,
                'tags': [t_ai, t_python, t_systems],
                'featured': True
            },
            {
                'title': 'React Re-render Hell: Diagnosing Wasted Renders with the Profiler',
                'content': '''A component re-rendering isn't inherently a bug, but unnecessary re-renders cascading through a deep tree absolutely are. Before reaching for `memo` or `useCallback` everywhere, you need actual evidence of where time is being spent. The React DevTools Profiler is the right starting point, not intuition.

### Step 1: Record, Don't Guess

Open the Profiler tab, hit record, interact with the slow part of the UI, and stop. Sort the flame graph by render duration. Components that re-render with an identical commit duration but no visible UI change are your first suspects - they're doing work for nothing.

### Step 2: The Usual Culprits

Three patterns account for most wasted renders in real codebases:

```tsx
// 1. Inline object/array literals as props - a new reference every render
<ExpensiveList items={data.filter(d => d.active)} />

// 2. Inline function props - breaks React.memo on the child
<Button onClick={() => handleClick(item.id)} />

// 3. Context value object recreated on every provider render
<MyContext.Provider value={{ user, theme }}>
```

Each of these defeats `React.memo` because the prop reference changes every single render, even when the underlying data hasn't.

### Step 3: Fixing It Without Overusing memo

```tsx
// Memoize derived data so the reference is stable across renders
const activeItems = useMemo(() => data.filter(d => d.active), [data]);

// Memoize the callback itself
const handleItemClick = useCallback((id: string) => handleClick(id), [handleClick]);

// Split context into stable slices instead of one growing object
const userValue = useMemo(() => ({ user }), [user]);
const themeValue = useMemo(() => ({ theme }), [theme]);
```

### Step 4: When memo Isn't Enough

If a parent re-renders 60 times a second (a live chart, a streaming chat response), wrapping children in `memo` only helps if the equality check is actually cheap. For high-frequency updates, it's often faster to push the changing value down into a leaf component via a ref or a dedicated state slice, so only that leaf re-renders instead of memo-checking the whole subtree on every tick.

The rule that holds up in practice: profile first, memoize the specific prop or value causing the diff, and stop once the flame graph is flat - not before.''',
                'published_at': datetime(2026, 2, 12, 11, 0, 0, tzinfo=dt_timezone.utc),
                'likes_count': 167,
                'view_count': 1610,
                'tags': [t_react, t_frontend, t_systems],
                'featured': False
            },
            {
                'title': 'Zero-Downtime Deploys with Docker and Blue-Green Routing',
                'content': '''Restarting a single container on every deploy means every in-flight request during that window gets dropped. Blue-green deployment fixes this by keeping two identical environments running side by side and switching traffic only once the new one is confirmed healthy.

### The Setup

Run two versions of the app, "blue" (current) and "green" (incoming), each on its own internal port, with Nginx as the single entry point that decides which one receives traffic.

```yaml
# docker-compose.yml (simplified)
services:
  app_blue:
    image: myapp:current
    ports: ["8001:8000"]
  app_green:
    image: myapp:incoming
    ports: ["8002:8000"]
  nginx:
    image: nginx:alpine
    volumes: ["./nginx.conf:/etc/nginx/conf.d/default.conf"]
    ports: ["80:80"]
```

### Health-Checking Before the Switch

Never flip traffic blindly. Deploy green, then poll its health endpoint until it's actually ready:

```bash
#!/bin/bash
set -e
docker compose up -d app_green

for i in {1..30}; do
  if curl -sf http://localhost:8002/api/health/ > /dev/null; then
    echo "Green is healthy, switching traffic..."
    break
  fi
  sleep 2
done

# Atomically swap which upstream Nginx points to
sed -i 's/app_blue:8000/app_green:8000/' nginx.conf
docker exec nginx_container nginx -s reload

docker compose stop app_blue
```

### Why Nginx Reload, Not Restart

`nginx -s reload` re-reads the config and spawns new worker processes while the old workers finish serving their current connections - no dropped requests, no port flapping. A full restart would briefly close the listening socket.

### The Rollback Path Is the Real Point

The actual value of blue-green isn't the deploy, it's that rollback is just as instant: if green starts erroring under real traffic, switch the Nginx upstream back to blue and you're done in seconds, no rebuild required. That property alone is worth the extra container.''',
                'published_at': datetime(2026, 3, 5, 8, 30, 0, tzinfo=dt_timezone.utc),
                'likes_count': 134,
                'view_count': 1380,
                'tags': [t_devops, t_docker, t_systems],
                'featured': False
            },
            {
                'title': 'Hardening a Django API: CORS, CSRF, and Rate Limiting Done Right',
                'content': '''Most Django API security mistakes aren't exotic - they're misconfigured defaults left over from local development that quietly ship to production. Here's what actually matters, in the order it tends to bite people.

### CORS: Stop Using Allow-All in Production

`CORS_ALLOW_ALL_ORIGINS = True` is fine for local dev against `localhost:3000`, but it means any website on the internet can make authenticated requests to your API from a victim's browser. Lock it to an explicit allowlist:

```python
CORS_ALLOW_ALL_ORIGINS = DEBUG  # only true locally
CORS_ALLOWED_ORIGINS = [
    "https://example.com",
    "https://www.example.com",
]
CORS_ALLOW_CREDENTIALS = True
```

### CSRF on Session-Authenticated Endpoints

If you're using DRF's `SessionAuthentication` (cookies) anywhere, CSRF protection is mandatory, not optional - token-only APIs (JWT in headers) don't need it, but anything cookie-based does. Don't reach for `@csrf_exempt` to make an error go away without understanding why Django asked for the token in the first place.

```python
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = True
```

### Rate Limiting Before It's an Incident

DRF's throttling classes are enough for most APIs - you don't need a separate gateway just to stop a single client from hammering an endpoint:

```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/minute',
        'user': '120/minute',
    }
}
```

For anything that touches an LLM, a video encoder, or another metered downstream cost, throttle that specific view harder than the global default - a single misbehaving client script can otherwise run your GPU bill up in minutes.

### Security Headers Are Free

`django-secure` middleware or a few manual settings cover most of the OWASP-recommended headers with zero performance cost:

```python
SECURE_HSTS_SECONDS = 31536000
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'same-origin'
```

None of this is advanced. It's a checklist - and most production incidents trace back to one item on it being skipped, not to a novel exploit.''',
                'published_at': datetime(2026, 5, 20, 13, 45, 0, tzinfo=dt_timezone.utc),
                'likes_count': 201,
                'view_count': 1890,
                'tags': [t_django, t_security, t_systems],
                'featured': True
            },
            {
                'title': 'Grounding a Small Local LLM with Real Backend Tools',
                'content': '''A chatbot that only generates plausible-sounding text is a parlor trick. A chatbot that can actually search your database, call your own API endpoints, and answer with real numbers is a different product entirely - and you don't need GPT-4 or a hosted API to get there.

### The Constraint: Small Models Can't Reliably Call Tools

Function-calling APIs from larger hosted models work by having the model emit structured JSON describing which tool to call. Small local models (1-4B parameters) are unreliable at this - they hallucinate parameter names, emit malformed JSON, or just answer in prose instead. So the trick is to never ask the model to decide which tool to call at all.

### Deterministic Routing, LLM-Generated Answers

Instead, detect intent with plain keyword/regex matching on the server, run the matching tool as regular code, and only hand the LLM the *result* to phrase naturally:

```python
def detect_tool(message: str):
    for tool in TOOLS:  # ordered, first match wins
        match = tool.matches(message)
        if match:
            return tool, match
    return None

# In the chat view:
detected = detect_tool(user_message)
if detected:
    tool, match = detected
    result = tool.execute(user_message, match)
    messages.append({
        'role': 'system',
        'content': f"[Tool: {tool.name} result]\\n{result.context_text}\\n"
                    f"Use this real data to answer naturally."
    })

async for chunk in ollama_service.chat_async(messages):
    yield chunk
```

The model never has to understand tool-calling syntax. It just sees an extra system message with real data in it and writes a normal sentence around it - something even a 1.7B parameter model does well.

### Surfacing Progress Honestly

If you're streaming the response over Server-Sent Events anyway, emit step events as the tool actually runs, instead of faking delays on the frontend to *look* agentic:

```python
yield f"data: {json.dumps({'type': 'step', 'label': 'Searching...', 'status': 'running'})}\\n\\n"
result = run_tool(tool, message)
yield f"data: {json.dumps({'type': 'step', 'label': result.summary, 'status': 'done'})}\\n\\n"
```

This is a small amount of code, but it's the difference between a chatbot that's decoration and one that's actually wired into your product.''',
                'published_at': datetime(2026, 6, 22, 16, 0, 0, tzinfo=dt_timezone.utc),
                'likes_count': 98,
                'view_count': 740,
                'tags': [t_llm, t_ai, t_python],
                'featured': True
            }
        ]

        for p_data in posts_data:
            # Check if post already exists
            post, created = Post.objects.get_or_create(
                title=p_data['title'],
                defaults={
                    'content': p_data['content'],
                    'author': user,
                    'status': Post.STATUS_PUBLISHED,
                    'likes_count': p_data['likes_count'],
                    'view_count': p_data['view_count'],
                    'featured': p_data['featured'],
                }
            )
            
            # Associate tags
            if created:
                for tag in p_data['tags']:
                    post.tags.add(tag)
                post.save()

            # Force past publication dates and created_at bypassing auto_now_add using update()
            Post.objects.filter(pk=post.pk).update(
                created_at=p_data['published_at'],
                published_at=p_data['published_at']
            )

            action = "Created & dated" if created else "Updated date for"
            self.stdout.write(f"{action} post: '{post.title}' (Published: {p_data['published_at'].date()})")

        self.stdout.write(self.style.SUCCESS('Successfully seeded high-quality engineering blogs.'))
