---
title: "MuCAL: Contrastive Alignment for Preference-Driven KG-to-Text Generation (Accepted by EMNLP 2025 Main)" 
date: 2025-08-20
tags: ["Reinforcement Learning","Contrastive Learning","Data-to-Text","Alignment"]
author: ["Yifei Song","Claire Gardent"]
description: "MuCAL is a multilingual KG–text alignment model that generates preference data to enable DPO training, improving KG-to-text generation and out-of-domain generalization." 
summary: "We introduces MuCAL (Multilingual Contrastive Alignment Learning), a multilingual model for aligning knowledge graphs (KG) with text. MuCAL enables robust KG–text retrieval across languages and difficulty levels, and is used to automatically generate preference data by ranking outputs from multiple LLMs. With this data, we further apply Direct Preference Optimization (DPO) to directly align generation with KG semantics, avoiding reward modeling. Experiments on KG-to-English text generation show that MuCAL-based similarity signals improve DPO training and achieve better out-of-domain generalization than standard instruction tuning, demonstrating MuCAL’s effectiveness for preference learning in KG-to-text tasks." 
cover:
    image: "flowchart.png"
    alt: "MuCAL-powered DPO training pipeline."
    relative: true
editPost:
    URL: "https://2025.emnlp.org/"
    Text: "EMNLP 2025"

---

---

##### Download

+ [Paper (to be released)]()
+ [Code and data (to be released)]()

---

##### Abstract

We propose MuCAL (Multilingual Contrastive Alignment Learning) to tackle the challenge of Knowledge Graphs (KG)-to-Text generation using preference learning, where reliable preference data is scarce. MuCAL is a multilingual KG/Text alignment model achieving robust cross-modal retrieval across multiple languages and difficulty levels. Building on MuCAL, we automatically create preference data by ranking candidate texts from three LLMs (Qwen2.5, DeepSeek-v3, Llama-3). We then apply Direct Preference Optimization (DPO) on these preference data, bypassing typical reward modelling steps to directly align generation outputs with graph semantics. Extensive experiments on KG-to-English Text generation show two main advantages: (1) Our KG/text similarity models provide a better signal for DPO than similar existing metrics, and (2) significantly better generalisation on out-of-domain datasets compared to standard instruction tuning. Our results highlight MuCAL’s effectiveness in supporting preference learning for KG-to-English Text generation and lay the foundation for future multilingual extensions.

---

##### Flowchart

![](flowchart.png)

<!-- --- -->
<!-- 
##### Citation

Unterholzer, Detlev A., and  Moritz-Maria von Igelfeld. 2013. "Unusual Uses For Olive Oil." *Journal of Oleic Science* 34 (1): 449–489. http://www.alexandermccallsmith.com/book/unusual-uses-for-olive-oil.

```BibTeX
@article{UI13,
author = {Detlev A. Unterholzer and Moritz-Maria von Igelfeld},
year = {2013},
title ={Unusual Uses For Olive Oil},
journal = {Journal of Oleic Science},
volume = {34},
number = {1},
pages = {449--489},
url = {http://www.alexandermccallsmith.com/book/unusual-uses-for-olive-oil}}
```

--- -->

<!-- ##### Related material

+ [Presentation slides](presentation1.pdf)
+ [Summary of the paper](https://www.penguinrandomhouse.com/books/110403/unusual-uses-for-olive-oil-by-alexander-mccall-smith/) -->
