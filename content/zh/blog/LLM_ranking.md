---
title: "Ranking"
date: 2025-08-18
tags: ["NLP", "Rank"]
author: "Yifei"
description: ""
summary: ""
showToc: true
disableAnchoredHeadings: false
---

## Ranking Methods
- Pointwise
- Listwise
- Pairwise
- Setwise

### Pointwise
- 最常见的automatic metric
- LLM-as-a-Judge: 输入单个文本，输出评分

Pros: Token effiecient and scalable

Cons: struggle to capture comparative information across candidates

### Listwise
一次将多个candidates输入prompt中，让LLM对它们进行排序。

Pros: 
- 完美适配目前LLM context windows size增大的趋势
- self-attention机制可以更为有效捕捉candidates之间的关系

Cons:
- Token-consuming (especially for long document/text tasks)
- Positional bias!! (如果做这个课题，必须要解决和讨论到这个)

**Related Work**
- RankGPT
- LRL
- TourRank
- ListT5

### Pairwise
感觉有时候定义有点vague，explicit pairwise应该指的是输入就是(Candidate A, Candidate B)，然后输出应该是两者比较的一个得分。但是有的时候，我们也可以用例如RankNet这样的方法，变相用pairwise的方法来训练模型，输入输出看起来还是pointwise的。

但是对于LLM-as-a-Judge来说，pairwise应该指的就是前者。在One inferecne的prompt中注入两个candidates，然后LLM来判断。

目前来看，这是个很不错的方法，有很多的研究集中在怎么把pairwise results 转换成listwise，相关工作有PRP-Graph (2024), REALM (2025) 这种。当然有很直接的*multi-round bubble sort*.

### Setwise
另一种很有意思的方法，首先对candidate list进行分割，然后对于每个集合选取最好的top-k，然后合并起来再筛选top-k。 有效缓解了listwise长序列的问题，并且比pairwise看起来更高效。

目前看到一个很不错的方法 (Pivot-based)，选择某个pivot放在每一个set里，然后淘汰比pivot差的，选择比pivot好的再进一步aggregate和filtering。

但是这种更加适用于拥有大量candidates的场景，比如RAG的这种大数据量ranking任务。



## LLM Uncertainty
LLM的uncertainty分为两种：
- Aleatoric：来自于noisy data，由于数据的噪音，因此LLM学不到清晰的信号。 -> irreducible
- Epistemic：来自于limited data coverage，主要是因为训练集的覆盖面太小，或者质量不够高导致的，总体而言就是训练数据的质量不够高。-> mitigated （增加训练量？RAG？）


