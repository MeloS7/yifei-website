---
title: "On-Policy Distillation"
date: 2025-10-28
tags: ["NLP", "Knowledge Distillation"]
author: "Yifei"
description: ""
summary: ""
showToc: true
disableAnchoredHeadings: false
---

## Useful Papers/Articles
- On-Policy Distillation (from Thinking Machine) [Link](https://thinkingmachines.ai/blog/on-policy-distillation/)
- On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes [Link](https://arxiv.org/abs/2306.13649)

## Abstract
### Training Stages
- **Pre-training**: teaches general capacities such as language use, broad reasoning, and world knowledge.
- **Mid-training**: imparts domain knowledge, such as code, medical databases, or internal company documents.
- **Post-training**: elicits targeted behavior, such as instruction following, reasoning through math problems, or chat.

所以说看起来专业知识的注入被归纳为Mid-training的部分了？感觉在做Pre-training的时候，如果数据集覆盖面本身已经比较强，那就是已经包含了Mid-training。但是如果是面对一个新的domain，我是否有可能在post-training之后再次通过mid-training注入domain-specific knowledge？我有些猜测：
- Mid-training并不需要很干净的文本，可以是比较嘈杂的包含知识的数据。因此，如果在post-training之后看起来没法直接做这样的训练，不然有可能会破坏instruction-following的能力。
- 我有点怀疑如果Post-training数据量太大的话，这个Mid-training中注入的某些知识可能会被遗忘了，或者说很难被引发。
- 所以解决的方案应该是，要不构建一个高质量的post-training专业知识训练集，要不就另辟蹊径（知识蒸馏之类的）。

### On/Off-Policy KD
| KD Type | Mechanism | Method |
| --- | --- | --- |
| On-Policy KD |  Teacher does, Student learns | Teacher Trajectory/Logits|
| Off-Policy KD (GKD) | Student does, Teacher corrects | Logits|

### KL Divergences
- **Forward KL (mode-coverage)**: $D_{KL}(P||Q_\theta)=\sum_{c\in C}P(c)\log\frac{P(c)}{Q_\theta(c)}$
- **Reverse KL (mode-seeking)**: $D_{KL}(Q_\theta||P)=\sum_{c\in C}Q_\theta(c)\log\frac{Q_\theta(c)}{P(c)}$

where $P(C)$ is the empirical distribution, $Q_\theta(C)$ is the model distribution.

![KL image](../pic/GKD/KL_divergence.png)
Forward KL会惩罚P有mass但是Q没有mass的情况，因此相当于Q需要“全面模仿”P的分布；而Reverse KL只关注Q有mass的情况，因此只要对于Q分布下的峰值和P的峰值重合，这个KL就会很小，所以被视作mode-seeking。

放到token prediction的视角，做logit-based KD：如果我们用Forward KL作为loss，那学生模型必须要学会teacher model的logits，哪怕teacher model对某些token只赋予了比较小的比重，也需要学习；而如果采用Reverse KL的话，那我们可能只关注top-1～N个token，在大多数情况下其实就是top1（logit最大的）token，也就是学生模型只要能够和教师模型在greedy模式下表现一致就可以。

<u>Q：我也不是很清楚一般蒸馏的时候，到底teacher model的temperature如何设置？以及应该采用哪种KL？</u>

### KL Divergence Unbounded Problem
为什么KL Divergence是unbounded？
- KL Divergence本身是不symmetric的: $D_{KL}(P||Q_\theta) \neq D_{KL}(Q_\theta||P)$
- 根据定义，是可能存在分母为0，分子>0的情况，这样使得log项∞了。(Unbounded)
- 如果要使用KLD作为loss，这种unbounded情况很容易出现，会导致训练发散（loss=NaN/inf)或者梯度爆炸。

解决方案：**JSD**
![JSD](../pic/GKD/JSD.png)


### Generalized KD (GKD)
**Baselines**:
- **Supervised FT (SFT)**: 纯SFT，不需要任何teacher model
- **Sequence-Level KD (SeqKD)**: 标准Offline KD，相当于在Teacher outputs上做SFT
- **Supervised KD**: Logit-based KD，用Teacher outputs来计算KL: $L_{SD}(\theta)=\mathbb{E}_{(x,y)\sim(X,Y)}[\mathcal{D}_{KL}(p_T||p^{\theta}_S)(y|x)]$

（这篇论文最后的蒸馏是根据T5做的，所以没有涉及到Zero/Few-shot这类问题）

**Formula & Algorithm**
![GKD_formula](../../pic/GKD/GKD_formular.png)
- 第一部分其实类似于Offline的Supervised KD （基于Teacher Outputs）
- 第二部分是提出的on-policy KD，基于Student Outputs的

![GKD](../../pic/GKD/GKD.png)
- 其实是分批的，用一个random value来控制学习模式。
- 其实并不是说对于同一个sample同时进行两种模式的学习
- 缓解了之前SKD train-inference discrepancy的issue。

**Others**
- 文章中提到on-policy KD都是基于一个SFT的模型进行的，所以说对小的student model要做SFT，这一点和标准的RLHF是相同的。
- 提到了这个训练范式可以从RLHF转变成RLAIF，只需要把第一项的SKD转变成一个类似于reward的item项。
- 文章提到说对于KL的选择(forward/reverse/JSD)还是要task-dependant的，我猜测大概率就是要实验测试。
- 对于XSum的实验，teacher model的temperature也用的1.







