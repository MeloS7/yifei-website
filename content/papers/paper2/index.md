---
title: "Multilingual Verbalisation of Knowledge Graphs (Accepted by EMNLP 2025 Findings)" 
date: 2025-08-20
tags: ["KG-to-Text","LLM Prompting","Multilingualism","Low-resource Languages","Machine Translation"]
author: ["Yifei Song", "William Soto Martinez", "Anna Nikiforovskaya", "Evan Parker Kelly Chapple", "Claire Gardent"]
description: "No TL;DR" 
summary: "In this work, We investigate multilingual Knowledge Graph (KG)-to-Text generation across 9 languages, covering both high-resource (English, Chinese, French, Spanish, Russian) and low-resource languages (Breton, Irish, Maltese, Welsh). We construct silver multilingual training data and new gold out-of-domain test sets for the high-resource languages, and use these along with existing in-domain test sets to evaluate three approaches: (1) NLG+MT—a KG-to-English model followed by machine translation, (2) FTMT—fine-tuning multilingual MT models on the silver data, and (3) FewShot—LLM prompting with different strategies. We find that the best prompting strategy consistently outperforms the other methods across all nine languages, and we provide an analysis of performance differences between high- and low-resource languages as well as in- vs out-of-domain data." 
cover:
    image: "papers/paper2/metric_score.png"
    alt: "BLEU scores for KG-to-Text Generation on in- (Right) and out-of-domain (Left) data."
    relative: true
editPost:
    URL: "https://2025.emnlp.org/"
    Text: "EMNLP"

---

---

##### Download

+ [Paper (to be released)]()
+ [Code and data (to be released)]()

---

##### Abstract

Most work on Knowledge Graph (KG) verbalisation is monolingual leaving open the question of how to scale KG-to-Text generation to languages with varying amounts of resources. In this work, we explore KG-to-Text generation on nine languages including five high-resource (HR) languages (English, Chinese, French, Spanish, Russian) and four low-resource (LR) languages (Breton, Irish, Maltese, Welsh). We first construct silver multilingual training data for all nine languages and new gold out-of-domain test data for the five HR languages. Using this data and already available in-domain test sets for 7 of our 9 languages, we then compare three strategies: (1) NLG+MT—a state-of-the-art KG-to-English model followed by Machine Translation (MT) into the target language; (2) FTMT—multilingual MT models fine-tuned end-to-end on the silver data; and (3) FewShot—few-shot LLM prompting comparing 4 LLMs. We explore different prompting strategies and show that our best prompting strategy performs the best on all 9 languages, discussing the relative performance of the three approaches on Low vs High Resource languages and on in- vs out-of-domain data.

---

##### Main Result

![](metric_score.png)

<!-- ---

##### Citation

Prinzel, Florianus, and Moritz-Maria von Igelfeld. 2004. "The Finer Points of Sausage Dogs." *Journal of Canine Science* 43 (2): 89–109. http://www.alexandermccallsmith.com/book/the-finer-points-of-sausage-dogs.

```BibTeX
@article{PI04,
author = {Florianus Prinzel and Moritz-Maria von Igelfeld},
year = {2004},
title ={The Finer Points of Sausage Dogs},
journal = {Journal of Canine Science},
volume = {43},
number = {2},
pages = {89--109},
url = {http://www.alexandermccallsmith.com/book/the-finer-points-of-sausage-dogs}}
```

---

##### Related material

+ [Presentation slides](presentation2.pdf)
+ [Wikipedia entry](https://en.wikipedia.org/wiki/The_Finer_Points_of_Sausage_Dogs) -->
