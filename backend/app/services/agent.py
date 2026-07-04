"""Agent service — tool definitions + LLM tool-calling loop."""

import json
import re

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.user import User
from app.schemas.agent import AgentResponse
from app.services import posts as post_svc
from app.services import users as user_svc
from app.services import comments as comment_svc
from app.services import likes as like_svc
from app.schemas.like import LikeRequest

# ── Tool registry ──────────────────────────────────────────────────────────
# Each tool: { name, description, parameters (JSON Schema), role (min role), fn }


def _build_tool(name: str, desc: str, params: dict, role: str, fn) -> dict:
    return {
        "name": name,
        "description": desc,
        "parameters": params,
        "role": role,
        "fn": fn,
    }


ALL_TOOLS: list[dict] = []


def _register(name: str, desc: str, params: dict, role: str):
    """Decorator-less registration helper."""
    def deco(fn):
        ALL_TOOLS.append(_build_tool(name, desc, params, role, fn))
        return fn
    return deco


# ── Tier 1: user+ ──────────────────────────────────────────────────────────


@_register("search_posts", "搜索博客文章，支持关键词、分类、日期范围、模糊搜索。返回文章列表。",
           {"type": "object", "properties": {
               "keyword": {"type": "string", "description": "搜索关键词"},
               "skip": {"type": "integer", "description": "跳过条数，默认 0"},
               "limit": {"type": "integer", "description": "返回条数，默认 10，最大 50"},
               "category": {"type": "string", "description": "分类筛选：技术/创作/生活/交流/公告"},
               "fuzzy": {"type": "boolean", "description": "是否模糊搜索，默认 false"},
           }, "required": ["keyword"]},
           role="user")
def tool_search_posts(db: Session, user: User, keyword: str, skip: int = 0, limit: int = 10,
                      category: str | None = None, fuzzy: bool = False) -> str:
    posts = post_svc.search_posts(db, keyword=keyword, skip=skip, limit=limit,
                                  category=category, fuzzy=fuzzy)
    if not posts:
        return f"未找到与「{keyword}」相关的文章。"
    lines = [f"搜索「{keyword}」找到 {len(posts)} 篇文章："]
    for p in posts:
        lines.append(f"- [{p.id}] {p.title}（{p.category or '未分类'}，{p.created_at.strftime('%Y-%m-%d')}，{p.view_count} 次浏览）")
        if p.summary:
            lines.append(f"  摘要：{p.summary[:120]}")
    return "\n".join(lines)


@_register("list_posts", "获取文章列表，支持按分类、作者、排序筛选。",
           {"type": "object", "properties": {
               "skip": {"type": "integer", "description": "跳过条数，默认 0"},
               "limit": {"type": "integer", "description": "返回条数，默认 10，最大 50"},
               "category": {"type": "string", "description": "分类筛选"},
               "author_id": {"type": "integer", "description": "作者 ID"},
               "sort_by": {"type": "string", "enum": ["created_at", "views", "likes", "comments", "score"],
                           "description": "排序方式"},
           }},
           role="user")
def tool_list_posts(db: Session, user: User, skip: int = 0, limit: int = 10,
                    category: str | None = None, author_id: int | None = None,
                    sort_by: str | None = None) -> str:
    posts = post_svc.list_posts(db, skip=skip, limit=limit, category=category,
                                author_id=author_id, sort_by=sort_by)
    if not posts:
        return "暂无文章。"
    lines = [f"共 {len(posts)} 篇文章："]
    for p in posts:
        lines.append(f"- [{p.id}] {p.title}（{p.category or '未分类'}，{p.created_at.strftime('%Y-%m-%d')}）")
    return "\n".join(lines)


@_register("get_post", "获取单篇文章的完整内容（标题、正文、作者、标签等）。",
           {"type": "object", "properties": {
               "post_id": {"type": "integer", "description": "文章 ID"},
           }, "required": ["post_id"]},
           role="user")
def tool_get_post(db: Session, user: User, post_id: int) -> str:
    post = post_svc.get_post_detail(db, post_id)
    if not post:
        return f"文章 ID={post_id} 不存在。"
    return (
        f"标题：{post.title}\n"
        f"作者：{post.author.nickname or post.author.username}\n"
        f"分类：{post.category}\n"
        f"标签：{', '.join(post.tags) if post.tags else '无'}\n"
        f"发布时间：{post.published_at.strftime('%Y-%m-%d %H:%M') if post.published_at else '草稿'}\n"
        f"浏览：{post.view_count}\n\n"
        f"内容：\n{_strip_html(post.content)[:3000]}"
    )


@_register("get_post_comments", "获取文章的评论列表（含嵌套回复）。",
           {"type": "object", "properties": {
               "post_id": {"type": "integer", "description": "文章 ID"},
           }, "required": ["post_id"]},
           role="user")
def tool_get_post_comments(db: Session, user: User, post_id: int) -> str:
    comments = comment_svc.list_comments(db, post_id=post_id)
    if not comments:
        return "暂无评论。"
    lines = [f"共 {len(comments)} 条评论："]
    for c in comments:
        author = c.user.nickname or c.user.username
        lines.append(f"- [{c.id}] {author}：{_strip_html(c.content)[:200]}（{c.created_at.strftime('%m-%d %H:%M')}）")
        for r in c.replies:
            ra = r.user.nickname or r.user.username
            lines.append(f"  ↳ [{r.id}] {ra} 回复：{_strip_html(r.content)[:150]}")
    return "\n".join(lines)


@_register("get_user_profile", "获取用户公开资料（昵称、简介、文章数等）。",
           {"type": "object", "properties": {
               "user_id": {"type": "integer", "description": "用户 ID"},
           }, "required": ["user_id"]},
           role="user")
def tool_get_user_profile(db: Session, user: User, user_id: int) -> str:
    u = user_svc.get_user_or_404(db, user_id)
    return (
        f"用户名：{u.username}\n"
        f"昵称：{u.nickname or '未设置'}\n"
        f"简介：{u.bio or '未填写'}\n"
        f"角色：{u.role}\n"
        f"注册时间：{u.created_at.strftime('%Y-%m-%d')}"
    )


@_register("get_my_profile", "获取当前登录用户的个人信息。",
           {"type": "object", "properties": {}},
           role="user")
def tool_get_my_profile(db: Session, user: User) -> str:
    return (
        f"ID：{user.id}\n"
        f"用户名：{user.username}\n"
        f"昵称：{user.nickname or '未设置'}\n"
        f"邮箱：{user.email}\n"
        f"角色：{user.role}\n"
        f"简介：{user.bio or '未填写'}\n"
        f"注册时间：{user.created_at.strftime('%Y-%m-%d')}"
    )


@_register("get_site_config", "获取站点基本信息（名称、描述、功能开关等）。",
           {"type": "object", "properties": {}},
           role="user")
def tool_get_site_config(db: Session, user: User) -> str:
    s = get_settings()
    return (
        f"站点名称：{s.site_name}\n"
        f"站点描述：{s.site_description}\n"
        f"邮箱验证：{'开启' if s.email_verification_enabled else '关闭'}\n"
        f"评论功能：{'开启' if s.comments_enabled else '关闭'}\n"
        f"点赞功能：{'开启' if s.likes_enabled else '关闭'}"
    )


@_register("update_my_profile", "更新当前登录用户的个人资料。",
           {"type": "object", "properties": {
               "nickname": {"type": "string", "description": "昵称"},
               "bio": {"type": "string", "description": "个人简介"},
               "avatar_url": {"type": "string", "description": "头像 URL"},
               "gender": {"type": "string", "enum": ["male", "female", "other"], "description": "性别"},
           }},
           role="user")
def tool_update_my_profile(db: Session, user: User, **kwargs) -> str:
    from app.schemas.user import UserUpdate
    payload = UserUpdate(**{k: v for k, v in kwargs.items() if v is not None})
    user_svc.update_user(db, user, payload)
    return "个人资料已更新。"


# ── Tier 2: admin+ ─────────────────────────────────────────────────────────


@_register("create_post", "创建一篇新文章。",
           {"type": "object", "properties": {
               "title": {"type": "string", "description": "标题", "maxLength": 200},
               "content": {"type": "string", "description": "正文内容"},
               "category": {"type": "string", "enum": ["技术", "创作", "生活", "交流"],
                            "description": "分类（公告需 moderator+）"},
               "summary": {"type": "string", "description": "摘要", "maxLength": 500},
               "tags": {"type": "array", "items": {"type": "string"}, "description": "标签列表"},
               "status": {"type": "string", "enum": ["draft", "published"], "description": "状态，默认 draft"},
           }, "required": ["title", "content"]},
           role="admin")
def tool_create_post(db: Session, user: User, title: str, content: str,
                     category: str = "创作", summary: str | None = None,
                     tags: list[str] | None = None, status: str = "draft") -> str:
    from app.schemas.post import PostCreate
    from app.models.post import PostCategory, PostStatus
    payload = PostCreate(
        title=title, content=content,
        category=PostCategory(category) if category in PostCategory.__args__ else PostCategory.creative,
        summary=summary, tags=tags,
        status=PostStatus(status) if status in ("draft", "published") else PostStatus.draft,
    )
    post = post_svc.create_post(db, user, payload)
    return f"文章已创建：[{post.id}] {post.title}（状态：{post.status}）"


@_register("update_post", "更新已有文章的标题、内容或状态。",
           {"type": "object", "properties": {
               "post_id": {"type": "integer", "description": "文章 ID"},
               "title": {"type": "string", "description": "新标题"},
               "content": {"type": "string", "description": "新正文"},
               "category": {"type": "string", "description": "新分类"},
               "summary": {"type": "string", "description": "新摘要"},
               "tags": {"type": "array", "items": {"type": "string"}, "description": "新标签列表"},
               "status": {"type": "string", "enum": ["draft", "published"], "description": "新状态"},
           }, "required": ["post_id"]},
           role="admin")
def tool_update_post(db: Session, user: User, post_id: int, **kwargs) -> str:
    from app.schemas.post import PostUpdate
    post = post_svc.get_post_or_404(db, post_id)
    payload = PostUpdate(**{k: v for k, v in kwargs.items() if v is not None})
    post_svc.update_post(db, post, user, payload)
    return f"文章 [{post_id}] 已更新。"


@_register("delete_post", "删除一篇文章（仅限自己的文章或管理员）。",
           {"type": "object", "properties": {
               "post_id": {"type": "integer", "description": "文章 ID"},
           }, "required": ["post_id"]},
           role="admin")
def tool_delete_post(db: Session, user: User, post_id: int) -> str:
    post = post_svc.get_post_or_404(db, post_id)
    post_svc.delete_post(db, post, user)
    return f"文章 [{post_id}] 已删除。"


@_register("create_comment", "在文章下发表评论或回复。",
           {"type": "object", "properties": {
               "post_id": {"type": "integer", "description": "文章 ID"},
               "content": {"type": "string", "description": "评论内容"},
               "parent_id": {"type": "integer", "description": "回复的父评论 ID（可选）"},
           }, "required": ["post_id", "content"]},
           role="user")
def tool_create_comment(db: Session, user: User, post_id: int, content: str,
                        parent_id: int | None = None) -> str:
    from app.schemas.comment import CommentCreate
    getattr(post_svc, "get_post_or_404")(db, post_id)  # ensure post exists
    payload = CommentCreate(content=content, parent_id=parent_id)
    comment_svc.create_comment(db, user, payload, post=post_svc.get_post_or_404(db, post_id))
    return "评论已发表。"


@_register("delete_comment", "删除一条评论（仅限自己的评论或管理员）。",
           {"type": "object", "properties": {
               "comment_id": {"type": "integer", "description": "评论 ID"},
           }, "required": ["comment_id"]},
           role="admin")
def tool_delete_comment(db: Session, user: User, comment_id: int) -> str:
    comment = comment_svc.get_comment_or_404(db, comment_id)
    comment_svc.delete_comment(db, comment, user)
    return f"评论 [{comment_id}] 已删除。"


@_register("list_users", "列出所有注册用户（管理员功能）。",
           {"type": "object", "properties": {
               "skip": {"type": "integer", "description": "跳过条数"},
               "limit": {"type": "integer", "description": "返回条数，默认 20，最大 100"},
           }},
           role="admin")
def tool_list_users(db: Session, user: User, skip: int = 0, limit: int = 20) -> str:
    users = user_svc.list_users(db, skip=skip, limit=limit)
    lines = [f"共 {len(users)} 名用户："]
    for u in users:
        lines.append(f"- [{u.id}] {u.username}（{u.nickname or '无昵称'}，{u.role}，{'已验证' if u.is_verified else '未验证'}，{'启用' if u.is_active else '停用'}）")
    return "\n".join(lines)


@_register("set_user_status", "启用或停用一个用户（管理员功能）。",
           {"type": "object", "properties": {
               "user_id": {"type": "integer", "description": "用户 ID"},
               "is_active": {"type": "boolean", "description": "true=启用, false=停用"},
           }, "required": ["user_id", "is_active"]},
           role="admin")
def tool_set_user_status(db: Session, user: User, user_id: int, is_active: bool) -> str:
    target = user_svc.get_user_or_404(db, user_id)
    user_svc.set_user_status(db, target, is_active)
    return f"用户 [{user_id}] 已{'启用' if is_active else '停用'}。"


# ── Tier 3: owner only ─────────────────────────────────────────────────────


@_register("set_user_role", "修改用户角色（仅站主可用）。",
           {"type": "object", "properties": {
               "user_id": {"type": "integer", "description": "用户 ID"},
               "role": {"type": "string", "enum": ["user", "moderator", "admin"], "description": "新角色"},
           }, "required": ["user_id", "role"]},
           role="owner")
def tool_set_user_role(db: Session, user: User, user_id: int, role: str) -> str:
    target = user_svc.get_user_or_404(db, user_id)
    user_svc.set_user_role(db, target, role)
    return f"用户 [{user_id}] 角色已改为 {role}。"


@_register("delete_user", "删除一个用户（仅站主可用）。",
           {"type": "object", "properties": {
               "user_id": {"type": "integer", "description": "用户 ID"},
           }, "required": ["user_id"]},
           role="owner")
def tool_delete_user(db: Session, user: User, user_id: int) -> str:
    target = user_svc.get_user_or_404(db, user_id)
    user_svc.delete_user(db, target)
    return f"用户 [{user_id}] 已删除。"


# ── Tool helpers ────────────────────────────────────────────────────────────


ROLE_LEVEL = {"user": 0, "moderator": 0, "admin": 1, "owner": 2}


def get_tools_for_role(role: str) -> list[dict]:
    """Return OpenAI-format tool definitions for the given role."""
    level = ROLE_LEVEL.get(role, -1)
    result = []
    for t in ALL_TOOLS:
        req = ROLE_LEVEL.get(t["role"], 2)
        if level >= req:
            result.append({
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t["parameters"],
                },
            })
    return result


def execute_tool(name: str, args_json: str, db: Session, user: User) -> str:
    """Execute a tool by name. Returns the result string."""
    for t in ALL_TOOLS:
        if t["name"] == name:
            try:
                kwargs = json.loads(args_json) if args_json else {}
                return t["fn"](db, user, **kwargs)
            except Exception as e:
                return f"工具执行出错：{e}"
    return f"未知工具：{name}"


def run_agent(db: Session, user: User, message: str, context: dict | None) -> AgentResponse:
    """Run the LLM tool-calling loop and return the final reply."""
    settings = get_settings()
    tools = get_tools_for_role(user.role)
    system_prompt = _build_system_prompt(db, user, context)

    messages: list[dict] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": message},
    ]

    api_url = f"{settings.llm_base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }

    max_turns = 6  # safety limit
    for _ in range(max_turns):
        resp = httpx.post(
            api_url,
            json={
                "model": settings.llm_model,
                "messages": messages,
                "tools": tools if tools else None,
            },
            headers=headers,
            timeout=120,
        )

        if resp.status_code != 200:
            return AgentResponse(reply=f"AI 服务请求失败（{resp.status_code}），请稍后重试。")

        body = resp.json()

        # Handle OpenRouter error responses (may return 200 with error field)
        if "error" in body:
            err_msg = body["error"].get("message", str(body["error"]))
            return AgentResponse(reply=f"AI 服务错误：{err_msg}")

        choice = body.get("choices", [{}])[0]
        if not choice:
            return AgentResponse(reply=f"AI 返回了空响应")
        msg = choice["message"]

        if msg.get("tool_calls"):
            messages.append({"role": "assistant", "tool_calls": msg["tool_calls"]})
            for tc in msg["tool_calls"]:
                name = tc["function"]["name"]
                args = tc["function"]["arguments"]
                result = execute_tool(name, args, db, user)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": result,
                })
        else:
            return AgentResponse(reply=msg.get("content", "（AI 未返回内容）"))

    return AgentResponse(reply="AI 思考时间过长，请简化你的问题再试。")


# ── System prompt builder ───────────────────────────────────────────────────


def _build_system_prompt(db: Session, user: User, context: dict | None) -> str:
    """Build the system prompt, injecting page context data."""
    settings = get_settings()
    parts = [
        f"你是 {settings.site_name} 的 AI 助手。",
        f"当前用户：{user.nickname or user.username}（角色：{user.role}）",
    ]

    if context:
        page = context.get("page", "")
        parts.append("")

        if page == "post_detail" and context.get("post_id"):
            try:
                post = post_svc.get_post_or_404(db, int(context["post_id"]))
                parts.append(f"用户正在浏览文章：")
                parts.append(f"  标题：{post.title}")
                parts.append(f"  作者：{post.author.nickname or post.author.username}")
                parts.append(f"  分类：{post.category}")
                parts.append(f"  标签：{', '.join(post.tags) if post.tags else '无'}")
                parts.append(f"  浏览：{post.view_count} 次")
                parts.append(f"  正文（前 2000 字）：{_strip_html(post.content)[:2000]}")
            except Exception:
                pass

        elif page == "user_profile" and context.get("user_id"):
            try:
                u = user_svc.get_user_or_404(db, int(context["user_id"]))
                parts.append(f"用户正在浏览 {u.nickname or u.username} 的个人主页。")
                parts.append(f"  简介：{u.bio or '未填写'}")
                parts.append(f"  角色：{u.role}")
            except Exception:
                pass

        elif page == "home":
            posts = post_svc.list_posts(db, skip=0, limit=5)
            if posts:
                parts.append("首页最新文章：")
                for p in posts:
                    parts.append(f"  - [{p.id}] {p.title}（{p.category}）")

        elif page == "post_list":
            cat = context.get("category", "")
            kw = context.get("keyword", "")
            if cat:
                parts.append(f"用户正在浏览「{cat}」分类的文章列表。")
            if kw:
                parts.append(f"用户搜索了「{kw}」。")

    parts.append("")
    parts.append("请根据用户的消息，用中文回复。必要时使用工具获取数据。")

    return "\n".join(parts)


def _strip_html(html: str) -> str:
    """Remove HTML tags from a string."""
    return re.sub(r"<[^>]*>", "", html)
