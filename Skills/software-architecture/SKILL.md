---
name: software-architecture
description: Use for system architecture, module boundaries, dependency direction, APIs, domain models, and durable software structure.
---

# Software Architecture

Principal architecture for production systems.

## Non-negotiables
- UI -> application -> domain <- infrastructure
- Explicit public APIs before internals
- Typed boundaries; fail loud; least privilege
- Smallest vertical slice that proves the architecture

## Load these skills when needed
- improve-codebase-architecture
- codebase-design
- domain-modeling
- api-and-interface-design
- documentation-and-adrs
- premium-architecture-visual-3d (when UI/3D is part of the system)

Reject god files, circular deps, and business logic in UI.
