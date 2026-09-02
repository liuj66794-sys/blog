---
title: Tlisily — 本地优先 AI 角色桌面应用
description: 面向中文用户的 Windows AI 角色应用，包含多模型接入、流式聊天、角色卡、世界书、RAG、本地存储与安全发布链路。
permalink: /projects/tlisily/
pageLayout: ProjectCasePage
caseSlug: tlisily
sidebar: false
aside: false
comments: false
createTime: 2026/09/01 13:25:40
---

# Tlisily

面向中文用户的本地优先 Windows AI 角色扮演与聊天桌面应用，支持多 AI 后端与 OpenAI 兼容接口，并提供流式聊天。

产品包含 SillyTavern V2 / V3 角色卡、世界书、Persona、对话摘要、RAG、翻译、TTS、图像生成、联网搜索、SQLite 本地存储与 SecretStore 凭据管理。

技术实现包括 Svelte 5、TypeScript、Tauri 2、Rust、SQLite、Tailwind CSS 和 Vitest。v0.2.0-beta.1 面向 Windows x64 NSIS 发布，发布门禁包含前端覆盖率、Cargo 检查与测试、安装卸载 smoke。
