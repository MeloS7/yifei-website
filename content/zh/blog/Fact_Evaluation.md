---
title: "Fact Evaluation"
date: 2026-02-08
tags: ["NLP", "Fact Checking", "Fact Extraction", "Fact Alignment"]
author: "Yifei"
description: ""
summary: ""
showToc: true
disableAnchoredHeadings: false
---

# Fact Evaluation Paper Reading
- [FactScore](#FactScore) - EMNLP 2023
- [Extractive Fact Decomposition for Interpretable Natural Language Inference in one Forward Pass](#Extracive_Fact_Decomposition) - EMNLP 2025


## FactScore
[Paper Link](https://aclanthology.org/2023.emnlp-main.741/)

提出了一种能计算在确定信息源的情况下，有多少的atomic facts是被支持的metric。

![](../pic/fact_eval/factscore.png)
- 研究基于wikipedia biography
- 论文首先检测了三个商业模型(InstructGPT, ChatGPT, PerplexityAI)的FactSocre（Factual precision in Atomicity Score）。作者这里只关注了Factual Precision：
    - 从Wikidata中筛选了183人，构建了一个wikipedia people biography数据集。
    - **Atomic Fact Extraction**: 对每一个biography，首先用InstructGPT生成atomic facts，然后用人工annotator检验。
    - 对Fact进行人工分类：Irrelevant, Supported, Not-supported.
    - 检测三个模型生成的biography的factscore: 
    $$
    f(y) = \frac{1}{|\mathcal{A}_y|} \sum_{a \in \mathcal{A}_y} \mathbb{I}[a \text{ is supported by } \mathcal{C}],
    $$
    $$
    \text{FACTSCORE}(\mathcal{M}) = \mathbb{E}_{x \in \mathcal{X}}[f(\mathcal{M}_x) \mid \mathcal{M}_x \text{ responds}].
    $$
    $\mathcal{M}_x$ responds means $M$ did not abstain from responding to the prompt x. This definition assumes the following:
    - 我们的公式是基于如下假设：
        - Whether or not an atomic fact is supported by $\mathcal{C}$ is undebatable.
        - Every atomic fact in $\mathcal{A_y}$ has an equal weight of importance.
        - Pieces of information in $\mathcal{C}$ do not conflict or overlap with each other.

-  论文第二部分评估了FactScore的有效性
    - **动机**：主要在第一部分地方，只是定义了一个factscore的计算公式，但是并没有变成一个automtic metric，所有的评估都是基于人工标注的数据集。所以第二部分也很正常就先要研究如何构建一个automatic metric。
    - <span style="color:red">直接用InstructGPT来做atomic fact generation.</span> (原文说测试了一下和人工标注的差距不大...)
    - 研究了四种不同FactScore的variants：
        - **No-context LM**: \<Atomic-Fact> + True/False
        - **Retrieve→LM**: 先从given resource里retrive $k$ passages, 然后用这些passages + given fact + “True or False?”
        - **Non-parametric Probability (NP)**: estimates the plausibility of an atomic fact by computing token-level conditional likelihoods in a masked-language-model (MLM) fashion. Each token is masked in turn, and its probability is estimated using a non-parametric masked LM (Min et al., 2023), which relies on retrieval from a large corpus rather than a parameterized softmax head. The token-level probabilities are averaged to obtain a sentence-level score, which is then thresholded to determine factual support.
        - **Retrieve→LM + NP**: Retrieve和NP都supported才supported.
    - 计算人工标注和$LM_{eval}$之间的Error Rate：$FactScore(Human) - FactScore(LM_{eval})$
    - 继续用$LM_{eval}$测试了更多的模型。


#### Limitation
- Beyond factual precision：这里最大的问题就是FactScore只计算了Factual Precision，也就是说查看generation里的fact是否被English Wikipedia支持。并没有考虑到比如Reference Wikipedia page中的fact有多少被generate出来了。
- Fact Extraction/Generation： 这一过程严重依赖于InstructGPT，并且好像根据[源代码(def get_init_atomic_facts_from_sentence)](https://github.com/shmsw25/FActScore/blob/main/factscore/atomic_facts.py)还是使用了某种动态的prompt机制（1个BM25筛选出来最好的shot+7个固定的shots）。**文章其实并没有直接对fact extraction的这个质量进行评估？**

## Extracive_Fact_Decomposition
**Full Paper Name**: Extractive Fact Decomposition for Interpretable Natural Language Inference in one Forward Pass

[Paper Link](https://aclanthology.org/2025.emnlp-main.1615/)

