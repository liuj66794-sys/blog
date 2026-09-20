# FLASHCARD CONTENT AUDIT

执行：`node scripts/audit-politics-content.mjs`。报告由源目录及同步后的全部政治数据生成。

- 原卡 631 张全部有显式审校问句，旧 ID 全部保留。
- 26 张复合卡保留主问题，另设 38 个显式新 ID；当前 669 张。
- 选择题 1380 道；结构错误 0 项；需复核提示 577 项；相同问答 50 对。

结构检查覆盖 schema、空字段、ID、问句标题、metadata 前缀、选项、答案归属及异常换行。缺少标点或疑问词只是提示；选择题的完整陈述句也可能合法。相同题目可能在不同卷重复，保留卷归属和既有学习 ID，并在下表列出。

问答语义经逐卡结合原答案和课程正文审校；自动脚本不能证明政治事实全部正确，也不把简单关键词相交当作主题匹配证据。时政按明确年份提问，不将历史计划改称当前事实。

## 显式拆卡清单

| 原 ID（保留） | 新 ID | 原因 |
| --- | --- | --- |
| 30f1e853b4 | 30f1e853b4-constitution | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| 9197295764 | 9197295764-components | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| df90b86035 | df90b86035-security | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| c856e4d222 | c856e4d222-brics | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| 5668e145d3 | 5668e145d3-lander<br>5668e145d3-bricks | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| 615e74bffb | 615e74bffb-fendouzhe | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| 6010d3e366 | 6010d3e366-ningxia | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| 33dceb07c3 | 33dceb07c3-zones | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| 3db1e0e673 | 3db1e0e673-national | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| 4b3ddd496b | 4b3ddd496b-qinhuangdao | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| 298e588ee1 | 298e588ee1-grain | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| 5ddf57f880 | 5ddf57f880-torch | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| 7012f02ecd | 7012f02ecd-robot | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| fe4edea756 | fe4edea756-workers | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| a62fc7f5fd | a62fc7f5fd-spirit<br>a62fc7f5fd-speech | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| ab82514c6d | ab82514c6d-busan | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| 8e35c5a26d | 8e35c5a26d-korea | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| 850a29e000 | 850a29e000-chemistry<br>850a29e000-economics | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| dec17c4a77 | dec17c4a77-qian<br>dec17c4a77-satellite | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| bcfbe3f06f | bcfbe3f06f-un | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| 66b1bef2ab | 66b1bef2ab-xinjiang | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| eddada6a64 | eddada6a64-bridge | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| a950c44cd7 | a950c44cd7-grain | 将原答案中可独立考查的知识点拆开；主卡保留原ID和记录，新卡独立学习。 |
| 9ce6138b9b | 9ce6138b9b-2<br>9ce6138b9b-3<br>9ce6138b9b-4<br>9ce6138b9b-5<br>9ce6138b9b-6<br>9ce6138b9b-7<br>9ce6138b9b-8<br>9ce6138b9b-9<br>9ce6138b9b-10 | 十项定位各可独立回忆，拆成十张；原ID保留第一项，不将整张旧卡掌握状态扩散到九张新卡。 |
| b549a918e2 | b549a918e2-principles | 原答案含相互独立的记忆维度，保留原卡主问题，将原则或构成另设显式新卡。 |
| 78d6065dc1 | 78d6065dc1-structure | 原答案含相互独立的记忆维度，保留原卡主问题，将原则或构成另设显式新卡。 |

旧 ID 保留主问题及原 SRS；新增卡独立从未学状态开始。原始合并题干/答案保存在 source catalog 的 previousQuestion / previousAnswer 中；不复制旧卡掌握程度到新知识点，不删除旧记录。跨课相似考点保留旧 ID，避免丢失复习历史。

## 扫描结果

| 引用 | 类型 | 文本或对应 ID |
| --- | --- | --- |
| question:e6f31a5f21 | answer-doubt | 毛泽东思想、邓小平理论是中国化时代化的马克思主义，它们都（ ）。 |
| question:bb557b488d | short-question | 科学发展观（ ）。 |
| question:496d88a0dd | answer-doubt | 1951 年前后，党内大体形成了先用三个五年计划搞工业化建设，再向社会主义过渡的共识。下列关于向社会主义过渡的说法，正确的是（ ） |
| question:19e9eb1be9 | answer-missing | 社会主义协商民主，充分体现了社会主义民主的（ ）。 |
| question:96ef18c995 | answer-missing | （ ）是中国特色社会主义理论体系的开篇之作 |
| question:1f97ba0f1d | answer-missing | 在红军第五次反围剿失败的历史关头召开的一次具有伟大转折意义的重要会议是（ ） |
| question:0683d649a3 | answer-missing | 开始形成了以毛泽东同志为核心的党的第一代中央领导集体的会议是（ ） |
| question:839b4032f1 | answer-missing | 关于人民内部要在政治上实行的方针是（ ） |
| question:7945306222 | answer-missing | 在党与民主党派的关系上实行方针是（ ） |
| question:aef82b60ef | answer-missing | 在科学文化工作中实行方针是（ ） |
| question:47b4325b1e | answer-missing | 在经济工作以及其他各项工作中实行方针是（ ） |
| question:c30cb52889 | answer-missing | 中国共产党历史上，第一次使用"毛泽东思想的活的灵魂"的表述是在（ ） |
| question:f24681de43 | answer-missing | 已经包含了毛泽东思想的活的灵魂的实事求是、群众路线、独立自主三个方面的基本因子的著作是（ ） |
| question:d7fbced92f | answer-missing | 贯穿于毛泽东思想各个组成部分的立场、观点和方法是（ ） |
| question:3db81c6448 | answer-missing | 毛泽东思想的精髓是（ ） |
| question:46e460ecb5 | answer-missing | 毛泽东在延安整风期间对实事求是的科学含义作了马克思主义的界定，他指出："求"就是（ ）。 |
| question:e6bec5bd9f | answer-missing | 毛泽东在延安整风期间对实事求是的科学含义作了马克思主义的界定，他指出："是"就是（ ）。 |
| question:7a1cf59eba | answer-missing | 毛泽东在延安整风期间对实事求是的科学含义作了马克思主义的界定，他指出："实事"就是（ ）。 |
| question:600b3f35c5 | answer-missing | 中国共产党的根本工作路线是（ ），是我们党永葆青春活力和战斗力的重要传家宝 |
| question:7f93f9c208 | answer-missing | 群众路线，就是一切为了群众，一切依靠群众，从群众中来，到群众中去，这是党的（ ） |
| question:6799136fef | answer-missing | 毛泽东提出，经济工作和其他一切工作的生命线是（ ） |
| question:825738c584 | answer-missing | （ ）是我们党一切行动的根本出发点和落脚点，是我们党区别于其他一切政党的根本标志 |
| question:7b6ca9494c | answer-missing | 人民军队的唯一宗旨是（ ） |
| question:3f57490b19 | answer-missing | 检验党的一切工作的成效，最终要以（ ）为最高标准 |
| question:a2dc7be392 | answer-missing | 以下对毛泽东思想的科学含义理解错误的是（ ） |
| question:ad9293c432 | answer-missing | 毛泽东思想以其独创性理论丰富和发展了马克思列宁主义，构成一个博大精深的科学思想体系，提出了一系列相互关联的重要理论观点，它紧紧围绕的主题是（ ） |
| question:b6c782f1cf | answer-missing | 坚持实事求是，就要（ ） |
| question:814535fcd2 | answer-missing | 毛泽东思想的活的灵魂之一——实事求是的基本要求是（ ） |
| question:548840d6fc | answer-missing | 独立自主，就是（ ） |
| question:82eee19d77 | answer-missing | 中国共产党的根本工作路线是（ ），是我们党永葆青春活力和战斗力的重要传家宝 |
| question:8caebc934a | answer-missing | 群众路线，就是一切为了群众，一切依靠群众，从群众中来，到群众中去，这是党的（ ） |
| question:1e838cbd54 | answer-missing | 毛泽东提出，经济工作和其他一切工作的生命线是（ ） |
| question:d0cd7ea4c2 | answer-missing | （ ）是我们党一切行动的根本出发点和落脚点，是我们党区别于其他一切政党的根本标志 |
| question:862987c602 | answer-missing | 人民军队的唯一宗旨是（ ） |
| question:e9ada52021 | answer-missing | 检验党的一切工作的成效，最终要以（ ）为最高标准 |
| question:49c2478157 | answer-missing | 以下对毛泽东思想的科学含义理解错误的是（ ） |
| question:a4f9d901c0 | answer-missing | 毛泽东思想以其独创性理论丰富和发展了马克思列宁主义，构成一个博大精深的科学思想体系，提出了一系列相互关联的重要理论观点，它紧紧围绕的主题是（ ） |
| question:09c911c40a | answer-missing | 解决中国革命问题的基本前提是（ ） |
| question:48a459bfe0 | answer-missing | 中国革命的首要问题是（ ） |
| question:e0689c8a7d | answer-missing | 中国革命的首要对象是（ ） |
| question:a9a88e6c0d | answer-missing | 新民主主义经济纲领中极具特色的一项内容是（ ） |
| question:186ea3ab8c | answer-missing | 新民主主义社会中，处于领导地位的经济成分是（ ） |
| question:eeb899d01f | answer-missing | 独立自主，就是（ ） |
| question:df77c87e31 | answer-missing | 在新民主主义革命时期，中国共产党在马克思主义指导下，立足中国国情，走出了一条不同于俄国十月革命的道路，即（ ） |
| question:9fd363537d | answer-missing | 中国革命走农村包围城市、武装夺取政权的道路，根本在于处理好（ ）三者之间的关系 |
| question:0917a6a984 | answer-missing | 随着土地改革的基本完成，（ ）的矛盾逐步成为我国的社会的主要矛盾。 |
| question:ce4f9294eb | answer-missing | 新民主主义的政体是（ ） |
| question:3d0af5ffa9 | answer-missing | 包含着新民主主义革命和社会主义革命双重性质的经济政策是（ ） |
| question:ccaf84d3cf | answer-missing | 秋收起义失败后毛泽东创建的（ ）革命根据地，把武装斗争的主攻方向首先指向农村 |
| question:fe2219b42e | answer-missing | 中国红色政权能够存在与发展的根本原因是（ ） |
| question:d1883b3f58 | answer-missing | 毛泽东系统阐述中国革命三大法宝的文章是（ ） |
| question:99c62b8c56 | answer-missing | 中国革命建立最广泛的统一战线不仅是必要的，而且是可能的，这种可能是由（ ） |
| question:8dae38642b | answer-missing | 在同资产阶级的联盟中必须实行的方针是（ ） |
| question:6383a3228a | answer-missing | 无产阶级及其政党在统一战线中必须坚持的原则是（ ） |
| question:c50ec09825 | answer-missing | 中国新民主主义革命时期的统一战线包含着两个联盟。其中基本的、主要的联盟是（ ） |
| question:dc2bad4a21 | answer-missing | 中国革命的特点和优点是（ ） |
| question:38349249f0 | answer-missing | 建设新型人民军队的根本原则是（ ） |
| question:23718cb7ea | answer-missing | 下列著作中，毛泽东明确地把官僚资本主义列为中国民主革命的对象之一的是（ ） |
| question:a4213accc6 | answer-missing | 关于民主革命和社会主义革命的关系，表述不正确的是（ ） |
| question:8bc7f1f063 | answer-missing | 新民主主义革命胜利后是（ ） |
| question:675891f324 | answer-missing | 新民主主义革命的政治目标是（ ） |
| question:d1e7a754c8 | answer-missing | 造成近代中国贫困落后和一切灾难祸害的总根源，阻碍中国社会发展的最大障碍是（ ） |
| question:fcfeca5b45 | answer-missing | 在新民主主义时期，无产阶级及其政党实现中国革命领导权的根本保证是（ ） |
| question:4b2dc485cb | answer-missing | 毛泽东对新民主主义革命的基本经验作了集中概括的著作是（ ） |
| question:0d801120b8 | answer-missing | 成为党探索中国社会主义建设道路良好开端的文章，是毛泽东发表（ ） |
| question:a0abb8b2c3 | answer-missing | 《论十大关系》的报告围绕的基本方针是（ ） |
| question:93999ba4cf | answer-missing | 《论十大关系》的前五条主要讨论经济问题，其中前三条讲重工业和轻工业、农业的关系，沿海工业和内地工业的关系，经济建设和国防建设的关系。这实际上明确提出了（ ） |
| question:e7969cb492 | answer-missing | 不属于《论十大关系》讨论范畴的是（ ） |
| question:94f48abcd9 | answer-missing | 1956 年，毛泽东在《论十大关系》中指出的"第一大关系"是（ ） |
| question:ef2e9ab056 | answer-missing | 党的八大正确分析了社会主义改造完成后我国社会主要矛盾的变化，提出今后党和国家的工作重点是（ ） |
| question:704df2d68c | answer-missing | 毛泽东系统论述社会主义社会矛盾理论的著作是（ ） |
| question:df5e4d02b0 | answer-missing | 毛泽东在《关于正确处理人民内部矛盾的问题》的报告中指出，社会主义社会的 基本矛盾**是（ ）** |
| question:499cf86698 | answer-missing | 毛泽东认为社会主义社会基本矛盾的特点是（ ） |
| question:92fdd79ac1 | answer-missing | 毛泽东认为，解决社会主义基本矛盾的途径和方法是（ ） |
| question:01a7320b8e | answer-missing | 下列不属于人民内部矛盾的是（ ） |
| question:2756042bc1 | answer-missing | 人民内部矛盾是（ ） |
| question:8582a37f3e | answer-missing | 解决敌我矛盾应采用（ ） |
| question:327d263af3 | answer-missing | 毛泽东在 1957 年 2 月所作的《关于正确处理人民内部矛盾的问题》的报告中，系统论述社会主义社会矛盾的理论。毛泽东强调，社会主义国家政治生活的主题是（ ） |
| question:81ea13225c | answer-missing | 关于人民内部矛盾表述正确的是（ ） |
| question:73b93144b6 | answer-missing | 党的八大提出我国国内的主要矛盾是（ ） |
| question:33e44b3afb | answer-missing | 走中国工业化道路的关键问题是（ ） |
| question:c169f04f2d | answer-missing | 我国走工业化道路的根本原因是（ ） |
| question:309873b86d | answer-missing | 实现我国工业化应坚持的方针不包括（ ） |
| question:03105fdc2e | answer-missing | 在社会主义建设道路初期探索的成果里，（ ）提出实行"两种劳动制度，两种教育制度"。 |
| question:3fb4bf3023 | answer-missing | 在社会主义建设道路初步探索过程中，关于生产资料所有制调整方面，提出了"三个主体，三个补充"设想的是（ ） |
| question:53d9c48380 | answer-missing | 我党提出的"三个主体、三个补充"意味着（ ） |
| question:d3955f3b93 | answer-missing | （ ）在一届全国人大一次会议的政府工作报告中代表党中央第一次提出关于"四个现代化"的构想。 |
| question:ca0309144c | answer-missing | 在社会主义建设道路初步探索时期，中共中央强调实现四个现代化关键在于（ ）。 |
| question:ad9970f8b7 | answer-missing | 关于《论十大关系》的表述正确的有（ ） |
| question:3ceb10a75c | answer-missing | 1957 年 2 月，毛泽东作了《关于正确处理人民内部矛盾的问题》的讲话，系统论述了社会主义社会矛盾的理论。毛泽东指出（ ） |
| question:7ee8906371 | answer-missing | 社会主义改造的任务完成以后，我国社会的基本矛盾是（ ） |
| question:7558b0e901 | answer-missing | 党的八大正确分析了社会主义改造完成后我国社会主要矛盾的变化，指出，社会主义制度在我国已经基本上建立起来了。我们国内的主要矛盾，已经是（ ） |
| question:6862b90a2d | answer-missing | 关于社会主义两类不同性质的矛盾表述正确的有（ ） |
| question:dc65544e2c | answer-missing | 毛泽东说："我们历来就主张，在人民民主专政下面，解决敌我之间的和人民内部的这两类不同性质的矛盾，采用专政和民主这两种不同的方法。"所谓民主的方法，就是（ ）的方法 |
| question:2243ff6aff | answer-missing | 毛泽东关于社会主义社会矛盾学说（ ） |
| question:065be6da88 | answer-missing | 在社会主义初步探索时期，走中国工业化道路，必须（ ） |
| question:6eae79b899 | answer-missing | 党在探索中国工业化道路中，提出把资本主义经济作为社会主义经济的补充的思想的是（ ） |
| question:52c47bfe61 | answer-missing | 毛泽东提出，社会主义发展阶段可以分为（ ） |
| question:9bde0780dc | answer-missing | 1964 年底，周恩来在三届全国人大一次会议提出了建设"四个现代化"的战略步骤，从第三个五年计划开始（ ） |
| question:241320d3db | answer-missing | 1954 年 9 月，周恩来在一届全国人大一次会议的政府工作报告中代表党中央第一次提出关于"四个现代化"的构想。"四个现代化"的战略目标（ ） |
| question:5cfa273513 | answer-missing | 20 世纪 50 年代中期至 60 年代中期，中国面临多方的公开的和潜在的威胁、战争挑衅和军事压力，（ ）是党在国际关系问题上考虑的中心。 |
| question:32f71e612c | answer-missing | 改革、发展、稳定三者不可分割，其中改革是（ ） |
| question:fef4909cf9 | answer-missing | 改革、发展、稳定三者不可分割，其中稳定是（ ） |
| question:411740288d | answer-missing | 改革、发展、稳定三者不可分割，其中发展是（ ） |
| question:0a21ce97d3 | answer-missing | 毛泽东明确提出"调动一切积极因素，为社会主义建设服务"这一基本方针是在（ ）。 |
| question:84cd9babba | answer-missing | 中国革命的对象是（ ），它们是压在中国人民头上的三座大山。 |
| question:75d6a71ea3 | answer-missing | 实现社会主义初级阶段奋斗目标的根本立足点是（ ）。 |
| question:008093f339 | answer-missing | 总结党建立、巩固和发展统一战线的实践经验，在革命进程中要坚持的策略方针是（ ）。 |
| question:cba125f926 | answer-missing | "和平统一、一国两制"构想的核心是（ ）。 |
| question:e3622ea1f5 | answer-missing | （ ）是新时代坚持和发展中国特色社会主义的根本立场，是贯穿党治国理政全部活动的一条红线。 |
| question:5aa56b93cd | answer-missing | （ ）系统总结了十八大以来改革开放的理论成果、制度成果、实践成果，勾勒出新时代全面深化改革开放更加清晰的蓝图。 |
| question:0321467a80 | answer-missing | 我们党作出"中国特色社会主义进入新时代"这一重大政治判断的基本依据是（ ）。 |
| question:c888394b6f | answer-missing | 党的二十大对全面建成社会主义现代化强国两步走战略安排作出进一步部署，根据这一部署，到 2035 年我国要实现的阶段性战略目标是（ ）。 |
| question:6c7d8a9053 | answer-missing | 坚定中国特色社会主义"四个自信"，是新时代中国共产党和中国人民砥砺前行的精神底气与实践根基，其形成源于长期奋斗的历史积淀与实践成果。在"四个自信"的有机整体中，具有更基础、更广泛、更深厚特质，能够为其他自信提供精神支撑与价值引领的是（ ）。 |
| question:1e8782076e | answer-missing | "草木植成，国之富也"出自《管子·立政》，这一古老智慧在当代仍具深刻指导意义，其蕴含的核心理念是（ ）。 |
| question:d425feee45 | answer-missing | （ ）是社会主义民主政治的本质属性。 |
| question:22afade16b | answer-missing | 为了纪念中国人民抗日战争暨世界反法西斯战争胜利 80 周年，2025 年 9 月 3 日举办了阅兵仪式，此次阅兵的主题是（ ）。 |
| question:b993105724 | answer-missing | 全面深化改革开放是一个复杂系统工程，正确的方法对于改革顺利推进、取得成功至关重要。习近平指出："改革开放是前无古人的崭新事业，必须坚持正确的方法论，在不断实践探索中推进。"以下属于正确的方法论的是（ ）。 |
| question:301d54e7a1 | answer-missing | 全面推进中国特色大国外交，应该要（ ）。 |
| question:4790d6538a | answer-missing | 加强和创新社会治理需要改进社会治理方式，必须坚持（ ）。 |
| question:84c3a905dd | answer-missing | 政治安全与人民安全、国家利益至上是有机统一的。以下关于三者的关系的说法中，正确的是（ ）。 |
| question:9928de7a85 | answer-missing | 以下对于共同富裕的理解中，正确的是（ ）。 |
| question:8943b18e42 | answer-missing | 中国特色社会主义法治道路的核心要义，就是要（ ）。 |
| question:315e1b75e6 | answer-missing | （ ）是新时代我国保障和改善民生的核心工作思路，这一思路明确了民生工作的方向与方法。 |
| question:9c83249fc2 | answer-missing | 党在领导新民主主义革命的过程中，逐步形成了（ ）的三大优良作风，这是中国共产党区别于其他任何政党的显著标志。 |
| question:647173d12f | no-question-cue | 2025 年 6 月，我国自主研制的 ______ 载人潜水器完成万米深潜任务，标志着我国深海探测技术进入全球领先行列。 |
| question:647173d12f | answer-missing | 2025 年 6 月，我国自主研制的 ______ 载人潜水器完成万米深潜任务，标志着我国深海探测技术进入全球领先行列。 |
| question:bfa38256d9 | no-question-cue | 2025 年 9 月 4 日，在上海举行的世界智慧城市大会中国＆区域颁奖典礼上，______ 荣获 2025 世界智慧城市大奖·中国最高荣誉"城市大奖"和"能源与环境大奖"。 |
| question:926ff6b6b1 | no-question-cue | 5 月 6 日，国家主席习近平同欧洲理事会主席科斯塔、欧盟委员会主席冯德莱恩互致贺电，热烈庆祝中国和欧盟建交 ______ 周年。 |
| question:6bb3e9211c | answer-missing | 2025 年《区域全面经济伙伴关系协定》（RCEP）对 ______ 正式生效，标志着全球最大自贸区实现全覆盖。 |
| question:cff1e3a4b1 | no-question-cue | 毛泽东在 1938 年党的六届六中全会上作了《论新阶段》的政治报告中，党首次明确提出了 ______ 重大命题，对后来党的理论发展和事业产生了深远的影响。 |
| question:6dedc5c59e | no-question-cue | ______ 是毛泽东思想紧紧围绕的主题。 |
| question:67e3c40589 | no-question-cue | 毛泽东在把统一战线、武装斗争、党的建设比作党在中国革命中战胜敌人的三个主要的法宝的著作是 ______。 |
| question:3d348afe27 | no-question-cue | 私人资本主义经济向社会主义国营经济过渡的形式是 ______。 |
| question:c6c704bd10 | no-question-cue | 从中华人民共和国成立到社会主义改造基本完成，我国社会的性质是 ______。 |
| question:846262ef24 | no-question-cue | 在"三个主体、三个补充"设想中，社会主义统一市场的主体是指 ______。 |
| question:9197dd3241 | no-question-cue | 20 世纪 90 年代，冷战结束后的国际局势发生了巨大变化，但时代主题仍然是 _____。 |
| question:acd5abb3a1 | no-question-cue | 党的十九大明确指出，我国社会主要矛盾已经转化为 ______。 |
| question:4b33943cb1 | no-question-cue | 习近平新时代中国特色社会主义思想的最重要、最核心的内容就是党的十九届六中全会概括的"十个明确"。其中，明确中国特色社会主义最本质的特征是 ______。 |
| question:4a496f744a | no-question-cue | 应对发展环境变化、增强发展动力、把握发展主动权，更好引领新常态的根本之策是 ______。 |
| question:99cf412fff | no-question-cue | 确保两岸关系和平发展的关键是 ______。 |
| question:6028177a26 | no-question-cue | ______ 是坚持党对人民军队绝对领导的根本制度和根本实现形式，在党领导军队的一整套制度体系中处于最高层次、居于统领地位。 |
| question:f7e7b5cd5c | no-question-cue | 中国梦的本质是 ______。 |
| question:cb7146bd08 | no-question-cue | 中国特色社会主义事业总体布局是 ______。 |
| question:bca066ba6e | no-question-cue | "四个伟大"是一个紧密联系、相互贯通、相互作用、有机统一的整体，统一于新时代坚持和发展中国特色社会主义伟大实践。其中指引前进方向的目标是 ______。 |
| question:97dd443df6 | no-question-cue | 激励全党全国各族人民前进的强大精神动力是 ______。 |
| question:0357d69bbd | no-question-cue | 中国特色社会主义理论体系包含 ______。 |
| question:1336105e80 | no-question-cue | 毛泽东思想是马克思主义中国化的第一个重大理论成果，以独创性的理论丰富和发展了马克思列宁主义。毛泽东思想是 ______。 |
| question:e262f16062 | no-question-cue | 我国全面推进依法治国的总目标是 ______。 |
| question:abf11e2fd4 | no-question-cue | 群众路线是以毛泽东为主要代表的中国共产党人坚持把马克思列宁主义关于人民群众是历史创造者的原理，系统地运用在党的全部活动中，形成的党的根本工作路线。群众路线，就是 ______。 |
| question:3dc4268096 | no-question-cue | 新民主主义革命的动力包括 ______。 |
| question:8d802c4ec7 | no-question-cue | 下列关于手工业的社会主义改造的说法，正确的是 ______。 |
| question:089ec7741d | no-question-cue | "三个代表"重要思想的核心观点包括 ______。 |
| question:cb6f380730 | no-question-cue | 习近平新时代中国特色社会主义思想的历史地位体现在它是 ______。 |
| question:07fb51a7a4 | no-question-cue | 我国外交政策的宗旨是 ______。 |
| question:c3a3959e2a | no-question-cue | 新时代党的建设的根本方针是 ______。 |
| question:bfdb4573bf | answer-missing | 马克思主义中国化理论成果的精髓是（ ） |
| question:1c07abe79d | answer-missing | 新民主主义经济纲领中，对官僚资产阶级垄断资本采取的措施是（ ） |
| question:02fc42fd7b | answer-missing | （ ）标志着党探索中国社会主义建设道路的良好开端。 |
| question:1e0e220016 | answer-missing | 毛泽东指出企业民主管理要实行"两参一改三结合"，其中"两参"是指（ ） |
| question:16d3fccea6 | answer-missing | 我国对外开放的格局是（ ） |
| question:4a42e3a8fb | answer-missing | 中国特色社会主义首要的基本理论问题是（ ） |
| question:875707df00 | answer-missing | 十八届三中全会中领导人强调指出，"（ ）是决定当代中国命运的关键一招，也是决定实现'两个一百年'奋斗目标、实现中华民族伟大复兴的关键一招"。 |
| question:7e7089fa6e | answer-missing | （ ）彰显了习近平新时代中国特色社会主义思想的理论品格和鲜明特征。 |
| question:d87c316439 | answer-missing | （ ）是马克思主义政党第一位的能力。 |
| question:a1b23efc42 | answer-missing | 2017 年 10 月，党的（ ）着眼中国特色社会主义事业长远发展，把习近平新时代中国特色社会主义思想确立为党必须长期坚持的指导思想并庄严写入党章，实现了党的指导思想的与时俱进。 |
| question:5354df6e56 | answer-missing | （ ）是获得真知灼见的源头活水，是贯彻群众路线的有效途径。 |
| question:ea73f8564c | answer-missing | （ ）是永葆党的肌体健康的生命之源，在党和国家各种监督形式中是最根本的、第一位的。 |
| question:b58aeb8541 | answer-missing | 铸牢中华民族共同体意识，推进新时代党的民族工作高质量发展。铸牢中华民族共同体意识，就是要引导各族人民牢固树立（ ） |
| question:6bd300a410 | answer-missing | （ ）是全面建成小康社会的底线任务，是必须抓紧抓好的第一民生工程。 |
| question:109967393c | answer-missing | 中国外交政策的宗旨是（ ） |
| question:7a9b5dafed | answer-missing | （ ）是全面建设社会主义现代化国家的基础性、战略性支撑。 |
| question:454934cc56 | answer-missing | 执政能力建设是党执政后的一项根本建设。提高执政能力要坚持（ ） |
| question:1d753d0a54 | answer-missing | 坚持和发展中国特色社会主义，总任务是实现（ ） |
| question:986b8ac80c | answer-missing | 建设美丽中国、实现中华民族永续发展必须树立的生态文明理念包括（ ） |
| question:58d3ce5a8e | answer-missing | 共建"一带一路"应坚持的理念包括（ ） |
| question:4dfbf30645 | no-question-cue | 2025 年 7 月 31 日，国务院常务会议审议通过《关于深入实施"人工智能+"行动的意见》，会议指出要大力推进人工智能 ______ 应用。 |
| question:4dfbf30645 | answer-missing | 2025 年 7 月 31 日，国务院常务会议审议通过《关于深入实施"人工智能+"行动的意见》，会议指出要大力推进人工智能 ______ 应用。 |
| question:29dfcb83b8 | no-question-cue | 2025 年 4 月 28 日上午，庆祝中华全国总工会成立 100 周年暨全国劳动模范和先进工作者表彰大会隆重举行，习近平强调 100 年来党的工运事业最重要成果是 ______。 |
| question:29dfcb83b8 | answer-missing | 2025 年 4 月 28 日上午，庆祝中华全国总工会成立 100 周年暨全国劳动模范和先进工作者表彰大会隆重举行，习近平强调 100 年来党的工运事业最重要成果是 ______。 |
| question:fbf7ccd4a0 | answer-missing | 2025 年 8 月，粤港澳大湾区首个跨境数据中心集群在哪个城市正式启用 ______。 |
| question:e95f447f1f | no-question-cue | 国务院办公厅印发《关于逐步推行免费学前教育的意见》，从 2025 年秋季学期起，将免除公办幼儿园学前一年在园儿童保育教育费。国家此举旨在 ______。 |
| question:f011b063d3 | no-question-cue | 近代中国的社会性质和主要矛盾决定了中国民主革命的性质是 ______。 |
| question:f011b063d3 | answer-missing | 近代中国的社会性质和主要矛盾决定了中国民主革命的性质是 ______。 |
| question:cc0bc3f329 | no-question-cue | 农业社会主义改造经历的由低级到高级的步骤和形式包括 ______。 |
| question:4c5320140e | no-question-cue | ______ 第一次比较系统论述了社会主义初级阶段的理论。【这个考点不熟悉的看教材 102 页】 |
| question:587313b095 | no-question-cue | 中国革命第一个和最凶恶的敌人是 ______。 |
| question:587313b095 | answer-missing | 中国革命第一个和最凶恶的敌人是 ______。 |
| question:3e458e3a19 | no-question-cue | 社会主义的根本任务是 ______。 |
| question:75c1ee3fb6 | no-question-cue | 党的十五大确立的我国社会主义初级阶段的基本经济制度是 ______。 |
| question:75c1ee3fb6 | answer-missing | 党的十五大确立的我国社会主义初级阶段的基本经济制度是 ______。 |
| question:0bbcabede6 | no-question-cue | 按照中国特色社会主义新时代"两步走"战略的安排，到 2035 年 ______。 |
| question:0bbcabede6 | answer-missing | 按照中国特色社会主义新时代"两步走"战略的安排，到 2035 年 ______。 |
| question:44ea8ea49e | no-question-cue | 巩固和发展最广泛的爱国统一战线，最根本的是坚持 ______。 |
| question:44ea8ea49e | answer-missing | 巩固和发展最广泛的爱国统一战线，最根本的是坚持 ______。 |
| question:f99ea91604 | no-question-cue | 我国人民军队的鲜明特色和政治优势是 ______。 |
| question:f99ea91604 | answer-missing | 我国人民军队的鲜明特色和政治优势是 ______。 |
| question:38a5ea7ea3 | no-question-cue | 推动"一带一路"建设的基本原则是 ______。 |
| question:38a5ea7ea3 | answer-missing | 推动"一带一路"建设的基本原则是 ______。 |
| question:604ab52060 | no-question-cue | "和平统一、一国两制"的核心是 ______。 |
| question:604ab52060 | answer-missing | "和平统一、一国两制"的核心是 ______。 |
| question:5cd600b17e | no-question-cue | 建设世界一流军队必须牢固树立的唯一的根本的标准是 ______。 |
| question:5cd600b17e | answer-missing | 建设世界一流军队必须牢固树立的唯一的根本的标准是 ______。 |
| question:1d094c8cb0 | no-question-cue | ______ 是我国的政体，是坚持党的领导、人民当家作主、依法治国有机统一的根本政治制度。 |
| question:1d094c8cb0 | answer-missing | ______ 是我国的政体，是坚持党的领导、人民当家作主、依法治国有机统一的根本政治制度。 |
| question:7cc388940f | no-question-cue | 党的十八届五中全会，首次提出新发展理念，其中引导发展的第一动力是 ______。 |
| question:7cc388940f | answer-missing | 党的十八届五中全会，首次提出新发展理念，其中引导发展的第一动力是 ______。 |
| question:19f49f8ed1 | no-question-cue | 在十二届全国人大一次会议解放军代表团全体会议上，习近平总书记指出，建设一支听党指挥、能打胜仗、作风优良的人民军队，是党在新形势下的强军目标。其灵魂是 ______。 |
| question:19f49f8ed1 | answer-missing | 在十二届全国人大一次会议解放军代表团全体会议上，习近平总书记指出，建设一支听党指挥、能打胜仗、作风优良的人民军队，是党在新形势下的强军目标。其灵魂是 ______。 |
| question:07646035c6 | no-question-cue | "四个自信"中更基础、更广泛、更深厚的自信是 ______。 |
| question:07646035c6 | answer-missing | "四个自信"中更基础、更广泛、更深厚的自信是 ______。 |
| question:500f2a5551 | no-question-cue | 2025 年我国在科技领域取得多项重大突破，其中属于航天领域成就的有 ______。 |
| question:500f2a5551 | answer-missing | 2025 年我国在科技领域取得多项重大突破，其中属于航天领域成就的有 ______。 |
| question:ad5a7ec178 | no-question-cue | 6 月 26 日 21 时 29 分，经过约 6.5 小时的出舱活动，神舟二十号乘组航天员 ______ 密切协同，在空间站机械臂和地面科研人员的配合支持下，圆满完成既定任务。 |
| question:528c1155b1 | no-question-cue | 毛泽东指出企业民主管理要实行"两参一改三结合"，其中"两参"是指 ______。 |
| question:0690c81b65 | no-question-cue | 毛泽东针对人民内部矛盾在具体实践中的不同情况，提出一系列具体方针、原则。对物质利益、分配方面的人民内部矛盾，毛泽东指出的方针是 ______。 |
| question:50a1775ca9 | no-question-cue | 建设中国特色社会主义事业的根本力量是 ______。 |
| question:50a1775ca9 | answer-missing | 建设中国特色社会主义事业的根本力量是 ______。 |
| question:69de450a9a | no-question-cue | 关于社会主义改造说法正确的是 ______。 |
| question:69de450a9a | answer-missing | 关于社会主义改造说法正确的是 ______。 |
| question:1ed0024e07 | no-question-cue | 全面建成小康社会中"全面"的含义是 ______。 |
| question:1ed0024e07 | answer-missing | 全面建成小康社会中"全面"的含义是 ______。 |
| question:bae085e9b7 | no-question-cue | 要坚持党的领导，必须不断加强和改善党的领导，当前改善党的领导，应着力解决的问题有 ______。 |
| question:bae085e9b7 | answer-missing | 要坚持党的领导，必须不断加强和改善党的领导，当前改善党的领导，应着力解决的问题有 ______。 |
| question:55818e3de0 | no-question-cue | 党的十八大以来，习近平总书记高度重视党的建设，在多个场合强调了党要管党、从严治党的重要性和紧迫性。全面从严治党要做到 ______。 |
| question:55818e3de0 | answer-missing | 党的十八大以来，习近平总书记高度重视党的建设，在多个场合强调了党要管党、从严治党的重要性和紧迫性。全面从严治党要做到 ______。 |
| question:2aec6b55ee | no-question-cue | 新时代党的建设目标是把党建设成为 ______。 |
| question:eb9435de33 | answer-missing | （ ）开始改变了起义军中旧军队的习气和不良作风，从组织上确立了党对军队的领导，是建设无产阶级领导的新型人民军队的重要开端。 |
| question:be41f50523 | answer-missing | 1987 年召开的党的（ ），第一次比较系统地论述了我国社会主义初级阶段理论，明确概括和全面阐发了党的"一个中心、两个基本点"的基本路线。 |
| question:b457042d4d | answer-missing | 社会主义建设道路初步探索时期，党中央强调，实现四个现代化关键在于（ ） |
| question:d8e4486d03 | answer-missing | 科学发展观的基本要求是（ ） |
| question:aa740f4c13 | answer-missing | 党的十四大正式确立的我国经济体制改革的目标是（ ） |
| question:a8e100181a | answer-missing | 在保障和改善民生中，最大的、最基本的民生是（ ） |
| question:13e023b8ff | answer-missing | （ ）是中国特色社会主义的重要物质基础和政治基础，是我们党执政兴国的重要支柱和依靠力量。 |
| question:789ae2fc67 | answer-missing | 加快建设世界一流军队，有效履行我军的根本职能，需要牢固树立的唯一的根本标准是（ ） |
| question:842caf536e | answer-missing | （ ）是改革开放的鲜明特征和首要任务，也是新时代贯彻新发展理念、构建新发展格局、推动高质量发展的必然要求。 |
| question:be353b3257 | answer-missing | 维护我国国家利益，放在第一位的是（ ） |
| question:016c9159eb | answer-missing | 党的十九届五中全会首次把统筹发展和安全纳入"十四五"时期我国经济社会发展的指导思想，党的二十大强调"统筹发展和安全"，并将其写入党章。以习近平同志为核心的党中央着眼统筹发展和安全、把握国家安全主动权，明确提出加快构建新安全格局。其中，安全解决的是（ ） |
| question:f200b5febf | answer-missing | 把（ ）纳入中国特色社会主义法治体系，是我国法治区别于其他国家法治的鲜明特征。 |
| question:76087098f3 | answer-missing | （ ）等社会主义基本经济制度，是中国特色社会主义制度的重要支柱。 |
| question:ceb43e0adc | answer-missing | 社会主义核心价值体系的基本内容是（ ） |
| question:7c81cebe91 | answer-missing | 进入新时代，推进党的建设新的伟大工程要一以贯之。新时代党的建设的根本方针是（ ） |
| question:5f50809258 | answer-missing | 党的二十大报告指出，习近平新时代中国特色社会主义思想的主要内容概括为（ ） |
| question:fdfde54182 | answer-missing | 新时代推进生态文明建设，必须坚持的方针是（ ）。 |
| question:d02cd6ecf6 | answer-missing | 坚持人民立场，就要（ ）。 |
| question:21a673fed4 | answer-missing | 高质量发展的重大战略意义包括（ ） |
| question:046804a8bd | no-question-cue | 1840 年鸦片战争之后，近代中国社会最主要的矛盾是 ______。 |
| question:046804a8bd | answer-missing | 1840 年鸦片战争之后，近代中国社会最主要的矛盾是 ______。 |
| question:dbb30d6688 | no-question-cue | 党的 ______ 全面阐发了党在社会主义初级阶段的基本路线可以概括为"一个中心，两个基本点"。 |
| question:dbb30d6688 | answer-missing | 党的 ______ 全面阐发了党在社会主义初级阶段的基本路线可以概括为"一个中心，两个基本点"。 |
| question:00d7978643 | no-question-cue | 走中国工业化道路，毛泽东提出"两参一改三结合"等重要思想，"两参一改三结合"中的"一改"是 ______ |
| question:00d7978643 | answer-missing | 走中国工业化道路，毛泽东提出"两参一改三结合"等重要思想，"两参一改三结合"中的"一改"是 ______ |
| question:013fef125c | no-question-cue | 改革开放和社会主义现代化建设新时期创立的邓小平理论的精髓是 ______ |
| question:013fef125c | answer-missing | 改革开放和社会主义现代化建设新时期创立的邓小平理论的精髓是 ______ |
| question:5753e4ab4b | no-question-cue | 基于当代中国基本国情，党作出了我国处于社会主义初级阶段的科学判断。这一阶段指的是 ______ |
| question:84b6889595 | no-question-cue | 我国对农业的社会主义改造采取的过渡形式是 ______。 |
| question:84b6889595 | answer-missing | 我国对农业的社会主义改造采取的过渡形式是 ______。 |
| question:c15e9acbd5 | no-question-cue | 中共八大提出我国国内的主要矛盾是 ______。 |
| question:c15e9acbd5 | answer-missing | 中共八大提出我国国内的主要矛盾是 ______。 |
| question:b8a1e36435 | answer-missing | "三个代表"重要思想用一系列紧密联系、相互贯通的新思想、新观点、新论断进一步回答了什么是社会主义、怎样建设社会主义的问题，创造性地回答了 ______ 的问题。 |
| question:757c901424 | no-question-cue | 我国改革的性质是 ______。 |
| question:757c901424 | answer-missing | 我国改革的性质是 ______。 |
| question:848c41b2a1 | no-question-cue | 中国共产党首次提出"解放台湾"的口号，是 1949 年 3 月新华社发表在 ______ 的时评中提出的。 |
| question:848c41b2a1 | answer-missing | 中国共产党首次提出"解放台湾"的口号，是 1949 年 3 月新华社发表在 ______ 的时评中提出的。 |
| question:8fa2238795 | no-question-cue | "一国两制"的构想提出当初是为了解决 ______。 |
| question:8fa2238795 | answer-missing | "一国两制"的构想提出当初是为了解决 ______。 |
| question:3c6ef6f4f0 | no-question-cue | 人民民主是社会主义的生命。没有民主就没有社会主义，就没有社会主义的现代化，就没有中华民族伟大复兴。社会主义愈发展，民主也愈发展。在前进道路上，要坚定不移走中国特色社会主义政治发展道路，继续推进社会主义民主政治建设、发展社会主义政治文明。社会主义民主政治的本质和核心是 ______。 |
| question:b04115a7d4 | no-question-cue | 党的十七大通过的党章把"和谐"与"富强、民主、文明"一起作为社会主义现代化建设的目标写入了社会主义初级阶段的基本路线。其原因在于社会和谐是 ______。 |
| question:b04115a7d4 | answer-missing | 党的十七大通过的党章把"和谐"与"富强、民主、文明"一起作为社会主义现代化建设的目标写入了社会主义初级阶段的基本路线。其原因在于社会和谐是 ______。 |
| question:e8290461bd | no-question-cue | 构建新发展格局，是以习近平同志为核心的党中央积极应对国际国内形势变化、与时俱进提升我国经济发展水平、塑造国际经济合作和竞争新优势作出的战略抉择。这一新发展格局是 ______。 |
| question:e8290461bd | answer-missing | 构建新发展格局，是以习近平同志为核心的党中央积极应对国际国内形势变化、与时俱进提升我国经济发展水平、塑造国际经济合作和竞争新优势作出的战略抉择。这一新发展格局是 ______。 |
| question:8c554087f8 | no-question-cue | 习近平指出，坚持反腐败无禁区、全覆盖、零容忍，坚定不移"打虎""拍蝇""猎狐"，不敢腐的目标初步实现，不能腐的笼子越扎越牢，不想腐的堤坝正在构筑，反腐败斗争压倒性态势已经形成并巩固发展。全面从严治党的长远之策、根本之策是 ______。 |
| question:8c554087f8 | answer-missing | 习近平指出，坚持反腐败无禁区、全覆盖、零容忍，坚定不移"打虎""拍蝇""猎狐"，不敢腐的目标初步实现，不能腐的笼子越扎越牢，不想腐的堤坝正在构筑，反腐败斗争压倒性态势已经形成并巩固发展。全面从严治党的长远之策、根本之策是 ______。 |
| question:467d564694 | no-question-cue | 检验党的一切执政活动的最高标准是 ______。 |
| question:467d564694 | answer-missing | 检验党的一切执政活动的最高标准是 ______。 |
| question:58373172cc | no-question-cue | 中国梦的科学内涵是 ______ |
| question:58373172cc | answer-missing | 中国梦的科学内涵是 ______ |
| question:d2cc845b64 | no-question-cue | 确保党始终总揽全局、协调各方，必须增强 ______，自觉维护党中央权威和集中统一领导，自觉在思想上政治上行动上同党中央保持高度一致。 |
| question:d2cc845b64 | answer-missing | 确保党始终总揽全局、协调各方，必须增强 ______，自觉维护党中央权威和集中统一领导，自觉在思想上政治上行动上同党中央保持高度一致。 |
| question:473ea23585 | no-question-cue | 毛泽东论述新民主主义的基本纲领的文章有 ______。 |
| question:473ea23585 | answer-missing | 毛泽东论述新民主主义的基本纲领的文章有 ______。 |
| question:338071e3ad | no-question-cue | 关于全面从严治党，下列说法正确的是 ______。 |
| question:338071e3ad | answer-missing | 关于全面从严治党，下列说法正确的是 ______。 |
| question:dacd118e8b | no-question-cue | 新时代党的建设目标是把党建设成为 ______。 |
| question:dacd118e8b | answer-missing | 新时代党的建设目标是把党建设成为 ______。 |
| question:91873081f1 | no-question-cue | 科学发展观最鲜明的精神实质是 ______。 |
| question:91873081f1 | answer-missing | 科学发展观最鲜明的精神实质是 ______。 |
| question:1ae0c630b9 | no-question-cue | 习近平指出："不论过去、现在和将来，我们都要坚持一切从实际出发，理论联系实际，在实践中检验真理和发展真理。"坚持实事求是，就要 ______。 |
| question:1ae0c630b9 | answer-missing | 习近平指出："不论过去、现在和将来，我们都要坚持一切从实际出发，理论联系实际，在实践中检验真理和发展真理。"坚持实事求是，就要 ______。 |
| question:59b027bd68 | no-question-cue | 新形势下，党需要应对的危险有 ______。 |
| question:59b027bd68 | answer-missing | 新形势下，党需要应对的危险有 ______。 |
| question:68cd53904e | no-question-cue | 改革开放以来，中国成功走上了一条与本国国情和时代特征相适应的和平发展道路。坚持走和平发展道路，符合中国历史文化传统，这是因为 ______。 |
| question:68cd53904e | answer-missing | 改革开放以来，中国成功走上了一条与本国国情和时代特征相适应的和平发展道路。坚持走和平发展道路，符合中国历史文化传统，这是因为 ______。 |
| question:68dc553bc3 | no-question-cue | 在台湾问题上，我国政府不承诺放弃使用武力是因为 ______。 |
| question:68dc553bc3 | answer-missing | 在台湾问题上，我国政府不承诺放弃使用武力是因为 ______。 |
| question:40335dfc1b | answer-missing | 跳出历史周期率问题，是关系党千秋伟业的一个重大问题。如何跳出历史周期率？如何实现长期执政？党始终在思索、一直在探索。毛泽东在延安的窑洞里给出了第一个答案，是（ ）。 |
| question:c05fab42ce | answer-missing | 近代中国的社会性质和主要矛盾，决定了中国革命的性质是（ ）。 |
| question:a4f68ca783 | answer-missing | 社会主义核心价值观中，属于公民层面的价值追求是（ ）。 |
| question:9ee32ce3c4 | answer-missing | "三个代表"重要思想创造性地回答了（ ）这一重大问题，集中起来就是深化了对中国特色社会主义的认识。 |
| question:d7d31107cc | answer-missing | 始终代表中国先进文化的前进方向，就是党的理论、路线、纲领、方针、政策和各项工作，必须努力体现发展面向现代化、面向世界、面向未来的，民族的科学的大众的社会主义文化的要求，促进全民族思想道德素质和科学文化素质的不断提高，为我国经济发展和社会进步提供精神动力和智力支持。其中，发展先进文化的重要内容和中心环节是（ ）。 |
| question:8bb299d116 | answer-missing | （ ）是我国实现社会主义现代化、创造人民美好生活的必由之路，是实现中华民族伟大复兴的必由之路。 |
| question:f02494fba0 | answer-missing | （ ）是我们党的根本性建设。 |
| question:23fe8c6b68 | answer-missing | 全面建设社会主义现代化国家，出发点和落脚点是（ ）。 |
| question:7aa4307fa2 | answer-missing | 我国坚定不移推动建设的新型国际关系的特点是（ ）。 |
| question:8c82b3969d | answer-missing | （ ）是民族复兴的根基。 |
| question:cd1e5a12c1 | answer-missing | 从严治党是我们党的一贯方针，坚持从严治党取得了巨大成绩，但一些问题仍屡禁不绝。必须从"全面从严"上下功夫，把从严治党的要求贯彻到党的建设各个方面，全面从严治党的关键在于（ ）。 |
| question:34b163109b | answer-missing | 在发展中保障和改善民生水平，其中是中华民族伟大复兴的基础工程，必须优先发展的是（ ）。 |
| question:496c47378e | answer-missing | 中国特色社会主义进入新时代，党的建设总要求中的原则是（ ）。 |
| question:4643df11bc | answer-missing | 高质量发展是全面建设社会主义现代化国家的首要任务，而新质生产力已经在实践中形成并展示出对高质量发展的强劲推动力、支撑力。以下有关"新质生产力"的表述，正确的是（ ）。 |
| question:b113fb22a9 | answer-missing | 毛泽东思想有多方面的内容，它除了关于新民主主义革命理论，关于社会主义革命和社会主义建设的理论外，还包括（ ） |
| question:5ce296b1d1 | answer-missing | 我国经济社会发展已经进入加快绿色化、低碳化的高质量发展的新阶段，要实现到本世纪中叶建成美丽中国的战略目标，必须（ ），谱写新时代社会主义生态文明建设新篇章。 |
| question:89bf919fdb | answer-missing | 中国共产党作为最高政治领导力量，在党和国家事业发展中居于中心地位。党的领导是（ ）。 |
| question:c76e0f65e0 | answer-missing | 20 世纪 50 年代中期，围绕台湾问题的国内外形势都发生很大变化。党及时调整对台政策，提出了和平解放台湾的设想。1956 年 4 月，毛泽东提出（ ）等政策主张。 |
| question:4d88dd28ea | answer-missing | 在共建共治共享中推进社会治理现代化需要做到（ ）。 |
| question:9c606669d2 | answer-missing | 坚持（ ）一体推进，就能为全面推进中国式现代化开辟发展新领新动能新优势，为全面建成社会主义现代化强国奠定更为坚实的基础。 |
| question:bb6c6032b5 | answer-missing | 由根本政治制度、基本政治制度以及重要政治制度等组成的制度体系是中国特色社会主义政治制度，它是中国共产党带领中国人民在革命、建设、改革的长期实践中形成的，集中体现了我国人民民主的本质属性，是保证人民当家作主科学有效的制度安排。其中，构成了我国的基本政治制度的是（ ）。 |
| question:a2e1375c9c | answer-missing | 习近平外交思想中，推动构建人类命运共同体的宗旨是（ ）。 |
| question:0699f2d898 | no-question-cue | 习近平总书记率中央代表团出席西藏自治区成立 60 周年庆祝活动，这在党和国家历史上是 ______，充分体现了党中央对西藏工作的高度重视。 |
| question:da42aae731 | no-question-cue | 2025 年 7 月，广东省工业和信息化厅公布 2025 年省级先进制造业集群名单，下列产业集群未入选的是 ______ |
| question:da42aae731 | answer-missing | 2025 年 7 月，广东省工业和信息化厅公布 2025 年省级先进制造业集群名单，下列产业集群未入选的是 ______ |
| question:7af14b890e | no-question-cue | 2025 年 7 月，全国自然灾害情况呈现出多种特点。下列关于 7 月自然灾害的描述，正确的是 ______ |
| question:fa36dbf2a3 | no-question-cue | 2025 年 3 月，习近平总书记在参加十四届全国人大三次会议江苏代表团审议时着重强调，2025 年是 ______ |
| question:e649ad6085 | no-question-cue | ______ 是新民主主义革命理论的核心问题。 |
| question:e649ad6085 | answer-missing | ______ 是新民主主义革命理论的核心问题。 |
| question:e7234e2c3d | no-question-cue | 毛泽东思想达到成熟的主要标志是 ______。 |
| question:e7234e2c3d | answer-missing | 毛泽东思想达到成熟的主要标志是 ______。 |
| question:70cdba2355 | no-question-cue | ______ 始终是中国共产党人认识世界和改造世界的根本要求，是我们党的基本方法、工作方法和领导方法，是党带领人民推动中国革命、建设、改革事业不断取得胜利的重要法宝。 |
| question:70cdba2355 | answer-missing | ______ 始终是中国共产党人认识世界和改造世界的根本要求，是我们党的基本方法、工作方法和领导方法，是党带领人民推动中国革命、建设、改革事业不断取得胜利的重要法宝。 |
| question:0a89d9a765 | no-question-cue | 毛泽东提出"三大法宝"的文章是 ______。 |
| question:0a89d9a765 | answer-missing | 毛泽东提出"三大法宝"的文章是 ______。 |
| question:9656cf28ab | no-question-cue | 和平赎买的具体方式 ______。 |
| question:9656cf28ab | answer-missing | 和平赎买的具体方式 ______。 |
| question:a88c8c277c | no-question-cue | 党的十八大把 ______ 写入党章，确立为党必须长期坚持的指导思想。 |
| question:a88c8c277c | answer-missing | 党的十八大把 ______ 写入党章，确立为党必须长期坚持的指导思想。 |
| question:67292dfc8a | no-question-cue | 改革开放以来，党在深刻总结和吸取新中国成立以来经济社会发展方面经验教训的基础上，把 ______ 摆在重要位置。 |
| question:67292dfc8a | answer-missing | 改革开放以来，党在深刻总结和吸取新中国成立以来经济社会发展方面经验教训的基础上，把 ______ 摆在重要位置。 |
| question:412669c48f | no-question-cue | 实现社会主义现代化奋斗目标的基本路径是 ______。 |
| question:412669c48f | answer-missing | 实现社会主义现代化奋斗目标的基本路径是 ______。 |
| question:724232ab08 | no-question-cue | 全面深化改革，要坚持以促进社会公平正义、______ 为出发点和落脚点。 |
| question:724232ab08 | answer-missing | 全面深化改革，要坚持以促进社会公平正义、______ 为出发点和落脚点。 |
| question:45bb1e65d2 | no-question-cue | 社会主义初级阶段的长期性，从根本上说是由 ______ 所决定的。 |
| question:45bb1e65d2 | answer-missing | 社会主义初级阶段的长期性，从根本上说是由 ______ 所决定的。 |
| question:68c7316fcd | no-question-cue | 我国社会主义初级阶段的基本经济制度是 ______。 |
| question:68c7316fcd | answer-missing | 我国社会主义初级阶段的基本经济制度是 ______。 |
| question:d6dcff4972 | no-question-cue | 深化供给侧结构性改革要持续推进"三去一降一补"，其中"一降"是指 ______。 |
| question:d6dcff4972 | answer-missing | 深化供给侧结构性改革要持续推进"三去一降一补"，其中"一降"是指 ______。 |
| question:d8516e3df8 | no-question-cue | 新时期爱国统一战线的主体和基础是 ______。 |
| question:d8516e3df8 | answer-missing | 新时期爱国统一战线的主体和基础是 ______。 |
| question:d619417dca | no-question-cue | 工人阶级的先进性最根本的体现在它是 ______。 |
| question:d619417dca | answer-missing | 工人阶级的先进性最根本的体现在它是 ______。 |
| question:1b5f70e76d | no-question-cue | 党的十八届三中全会通过的《中共中央关于全面深化改革若干重大问题的决定》指出，全面深化改革的总目标是 ______ |
| question:1b5f70e76d | answer-missing | 党的十八届三中全会通过的《中共中央关于全面深化改革若干重大问题的决定》指出，全面深化改革的总目标是 ______ |
| question:23d887f69c | no-question-cue | 当代中国最直接、最广泛的民主实践是 ______。 |
| question:23d887f69c | answer-missing | 当代中国最直接、最广泛的民主实践是 ______。 |
| question:e7564dcae8 | no-question-cue | 中国革命走农村包围城市、武装夺取政权的道路，根本上是处理好 ______ 之间的关系。 |
| question:e7564dcae8 | answer-missing | 中国革命走农村包围城市、武装夺取政权的道路，根本上是处理好 ______ 之间的关系。 |
| question:9d6ba2cae9 | no-question-cue | 发展是解决我国一切问题的基础和关键，发展必须是科学发展，必须坚定不移贯彻创新、______ 的发展理念。 |
| question:9d6ba2cae9 | answer-missing | 发展是解决我国一切问题的基础和关键，发展必须是科学发展，必须坚定不移贯彻创新、______ 的发展理念。 |
| question:499bafa8be | no-question-cue | 党的十八届三中全会提出的全面深化改革的总目标是 ______。 |
| question:499bafa8be | answer-missing | 党的十八届三中全会提出的全面深化改革的总目标是 ______。 |
| question:e33958ecd8 | no-question-cue | 在社会主义改造基本完成以后，正确处理人民内部矛盾的具体方针是 ______。 |
| question:e33958ecd8 | answer-missing | 在社会主义改造基本完成以后，正确处理人民内部矛盾的具体方针是 ______。 |
| question:8d226139c4 | no-question-cue | 社会主义初级阶段的两层含义是 ______。 |
| question:8d226139c4 | answer-missing | 社会主义初级阶段的两层含义是 ______。 |
| question:1057ad10c1 | no-question-cue | 习近平总书记系列重要讲话提出，要把握和处理好全面深化改革的一些重大关系，包括处理好 ______。 |
| question:1057ad10c1 | answer-missing | 习近平总书记系列重要讲话提出，要把握和处理好全面深化改革的一些重大关系，包括处理好 ______。 |
| question:61fd5feb87 | no-question-cue | 人民群众 ______ 的充分发挥，是社会主义事业成功的根本保证。 |
| question:61fd5feb87 | answer-missing | 人民群众 ______ 的充分发挥，是社会主义事业成功的根本保证。 |
| question:bfcc17a8bc | no-question-cue | 关于改革、发展、稳定之间的关系，以下说法正确的是 ______。 |
| question:bfcc17a8bc | answer-missing | 关于改革、发展、稳定之间的关系，以下说法正确的是 ______。 |
| question:a9249e0e26 | no-question-cue | 走中国特色社会主义法治道路的核心要义，就是要 ______。 |
| question:a9249e0e26 | answer-missing | 走中国特色社会主义法治道路的核心要义，就是要 ______。 |
| question:2c1043a69a | no-question-cue | 以下属于我国重大创新工程取得突破性进展的成果是 ______。 |
| question:2c1043a69a | answer-missing | 以下属于我国重大创新工程取得突破性进展的成果是 ______。 |
| question:5314e5847a | no-question-cue | 党的二十届四中全会提出，要构建更加完善的社会主义市场经济体制，其中重点强调要进一步发挥 ______ 在资源配置中的决定性作用。 |
| question:0cec97384d | no-question-cue | 党的二十届四中全会强调，全面深化改革要以 ______ 为根本目的，让改革发展成果更多更公平惠及全体人民。 |
| question:fbb4cf3fb5 | no-question-cue | 7 月 2 日，2025 全球数字经济大会在北京国家会议中心开幕。本届大会以 ______ 为主题。 |
| question:02061e55ba | no-question-cue | 以"模塑全球无限可能"为主题的 2025 全球开发者先锋大会在 ______ 举办。 |
| question:e1e2058b01 | no-question-cue | 毛泽东在 ______ 中完整地总结和概括了新民主主义革命总路线的内容。 |
| question:e1e2058b01 | answer-missing | 毛泽东在 ______ 中完整地总结和概括了新民主主义革命总路线的内容。 |
| question:a3337bcd5e | no-question-cue | 毛泽东思想紧紧围绕着 ______ 这一主题，提出了一系列相互联系的重要理论观点，构成一个完整的科学思想体系，具有丰富的内容。 |
| question:a3337bcd5e | answer-missing | 毛泽东思想紧紧围绕着 ______ 这一主题，提出了一系列相互联系的重要理论观点，构成一个完整的科学思想体系，具有丰富的内容。 |
| question:55a46e5891 | no-question-cue | 以 ______ 为标志，中国无产阶级开始作为独立的政治力量登上历史的舞台，成为革命的领导力量。 |
| question:55a46e5891 | answer-missing | 以 ______ 为标志，中国无产阶级开始作为独立的政治力量登上历史的舞台，成为革命的领导力量。 |
| question:f77fbb963a | no-question-cue | 走中国工业化道路，必须积极探索适合我国情况的经济体制和运行机制，其中 ______ 提出了发展商品生产、利用价值规律的思想。 |
| question:f77fbb963a | answer-missing | 走中国工业化道路，必须积极探索适合我国情况的经济体制和运行机制，其中 ______ 提出了发展商品生产、利用价值规律的思想。 |
| question:705c01ecdf | no-question-cue | ______ 确立邓小平理论为党的指导思想并且写入党章。 |
| question:705c01ecdf | answer-missing | ______ 确立邓小平理论为党的指导思想并且写入党章。 |
| question:d792856af0 | no-question-cue | 实现社会主义现代化奋斗目标的依靠力量是 ______。 |
| question:d792856af0 | answer-missing | 实现社会主义现代化奋斗目标的依靠力量是 ______。 |
| question:bd17cfb2f7 | no-question-cue | 中国特色社会主义的根本任务是 ______。 |
| question:bd17cfb2f7 | answer-missing | 中国特色社会主义的根本任务是 ______。 |
| question:648701d75d | no-question-cue | 关于独立自主和平外交政策的基本原则，下列说法中错误的是 ______。 |
| question:648701d75d | answer-missing | 关于独立自主和平外交政策的基本原则，下列说法中错误的是 ______。 |
| question:5dc024c226 | no-question-cue | 改革开放以来，党在深刻总结和吸取新中国成立以来经济社会发展方面经验教训的基础上，把 ______ 摆在重要位置。 |
| question:5dc024c226 | answer-missing | 改革开放以来，党在深刻总结和吸取新中国成立以来经济社会发展方面经验教训的基础上，把 ______ 摆在重要位置。 |
| question:1ef2b50305 | no-question-cue | 劳动、知识、人才、创造四个要素中，居于核心和基础地位的是 ______。 |
| question:1ef2b50305 | answer-missing | 劳动、知识、人才、创造四个要素中，居于核心和基础地位的是 ______。 |
| question:d91cdc6a1f | no-question-cue | ______ 是决定当代中国命运的关键一招。 |
| question:d91cdc6a1f | answer-missing | ______ 是决定当代中国命运的关键一招。 |
| question:18dcb73f6c | no-question-cue | ______ 决定军队建设的政治方向。 |
| question:18dcb73f6c | answer-missing | ______ 决定军队建设的政治方向。 |
| question:cbdd1c65e7 | no-question-cue | ______ 是我国对外工作的出发点以及落脚点。 |
| question:cbdd1c65e7 | answer-missing | ______ 是我国对外工作的出发点以及落脚点。 |
| question:c8e3d7e6fd | no-question-cue | ______ 是当代中国共产党人回答和解决关乎人类前途命运的时代之问的中国方案。 |
| question:c8e3d7e6fd | answer-missing | ______ 是当代中国共产党人回答和解决关乎人类前途命运的时代之问的中国方案。 |
| question:b12171c188 | no-question-cue | 我们党一切活动的出发点和落脚点是 ______。 |
| question:b12171c188 | answer-missing | 我们党一切活动的出发点和落脚点是 ______。 |
| question:f2fb26751b | no-question-cue | 新时期爱国统一战线的主体和基础是 ______。 |
| question:f2fb26751b | answer-missing | 新时期爱国统一战线的主体和基础是 ______。 |
| question:9474d43038 | answer-missing | 针对城乡区域发展不平衡问题，党的二十届四中全会提出要健全（ ）机制，推动城乡要素平等交换、双向流动，缩小区域发展差距。 |
| question:77a55169fb | no-question-cue | 推动构建新型国际关系，就是要秉持 ______ 的原则。 |
| question:77a55169fb | answer-missing | 推动构建新型国际关系，就是要秉持 ______ 的原则。 |
| question:e9d204b6c2 | no-question-cue | 坚持 ______ 周边外交方针，深化同周边国家友好互信和利益融合。 |
| question:f685dfc5a6 | no-question-cue | 在台湾问题上，我国政府不承诺放弃使用武力是因为 ______。 |
| question:f685dfc5a6 | answer-missing | 在台湾问题上，我国政府不承诺放弃使用武力是因为 ______。 |
| question:d771a7f8fd | no-question-cue | 人民群众 ______ 的充分发挥，是社会主义事业成功的根本保证。 |
| question:d771a7f8fd | answer-missing | 人民群众 ______ 的充分发挥，是社会主义事业成功的根本保证。 |
| question:429c46d13a | no-question-cue | 新时代加强和创新社会治理，要求坚持 ______。 |
| question:429c46d13a | answer-missing | 新时代加强和创新社会治理，要求坚持 ______。 |
| question:34530f05e7 | no-question-cue | 中国特色社会主义理论体系围绕 ______ 三大基本问题展开。 |
| question:34530f05e7 | answer-missing | 中国特色社会主义理论体系围绕 ______ 三大基本问题展开。 |
| question:c927019652 | no-question-cue | 改革开放以来，我国工人阶级队伍发生了明显变化，呈现出许多新的特点，包括 ______。 |
| question:c927019652 | answer-missing | 改革开放以来，我国工人阶级队伍发生了明显变化，呈现出许多新的特点，包括 ______。 |
| question:f281c702ce | no-question-cue | 在新的历史条件下，只有中国共产党能够团结和带领全国各族人民实现中华民族的伟大复兴，是因为 ______。 |
| question:f281c702ce | answer-missing | 在新的历史条件下，只有中国共产党能够团结和带领全国各族人民实现中华民族的伟大复兴，是因为 ______。 |
| question:b0a8ddc493 | no-question-cue | 2025年8月17日22时15分，我国在______卫星发射中心使用______运载火箭，成功将卫星互联网低轨09组卫星发射升空，卫星顺利进入预定轨道，发射任务获得圆满成功。 |
| question:59e47ab1f7 | no-question-cue | 8月17日，随着开挖直径17.5米的______盾构机刀盘破土而出，由济南城市建设集团投资建设、中铁十四局集团承建的济南市黄岗路黄河隧道盾构段掘进完成，这一世界最大直径水下盾构隧道顺利贯通。 |
| question:3569963112 | no-question-cue | 第12届世界运动会于8月17日晚在四川成都落下帷幕，这是我国大陆地区首次举办世界运动会。中国体育代表团在本届世运会上共夺得______，金牌、奖牌总数均创历史新高，首次位居金牌榜和奖牌榜第一，创我国参加世运会历史最好成绩。 |
| question:514fb28056 | no-question-cue | 8月16日上午，2025中国自动化与人工智能教育大会暨全国青少年劳动技能与智能设计大赛全国决赛在______启幕。本次大会以______为主题，旨在开辟智能教育新路径，打造教育新生态，为建设高质量教育体系汇聚磅礴智慧。 |
| question:9172cf1a7d | no-question-cue | 邓小平理论形成的现实依据是______。 |
| question:9172cf1a7d | answer-missing | 邓小平理论形成的现实依据是______。 |
| question:54b73eb417 | no-question-cue | 党的十九大对我国发展新的历史方位作出的重大政治判断是______。 |
| question:7f5490b085 | no-question-cue | "实事求是"的"实事"是指______。 |
| question:7f5490b085 | answer-missing | "实事求是"的"实事"是指______。 |
| question:25b30947d1 | no-question-cue | 以下关于"独立自主"的说法中，不正确的是______。 |
| question:25b30947d1 | answer-missing | 以下关于"独立自主"的说法中，不正确的是______。 |
| question:b841336a7f | no-question-cue | 1939年，毛泽东在_____第一次提出"新民主主义革命"的概念。 |
| question:b841336a7f | answer-missing | 1939年，毛泽东在_____第一次提出"新民主主义革命"的概念。 |
| question:1a5d6116f5 | no-question-cue | ______，正式提出了党在社会主义初级阶段的基本路线。 |
| question:1a5d6116f5 | answer-missing | ______，正式提出了党在社会主义初级阶段的基本路线。 |
| question:029ad19bb3 | no-question-cue | 中华民族的时代精神以______为核心。 |
| question:f8d5647eb7 | no-question-cue | 《中共中央关于建设社会主义和谐社会若干重大问题的决定》指出，社会和谐是中国特色社会主义的______。 |
| question:f8d5647eb7 | answer-missing | 《中共中央关于建设社会主义和谐社会若干重大问题的决定》指出，社会和谐是中国特色社会主义的______。 |
| question:adf5495c69 | no-question-cue | 中国共产党政治建设的首要任务是______。 |
| question:adf5495c69 | answer-missing | 中国共产党政治建设的首要任务是______。 |
| question:d6a216ff3b | no-question-cue | 实现和平发展，是中国人民的真诚愿望和不懈追求。中国外交政策的宗旨是______。 |
| question:d6a216ff3b | answer-missing | 实现和平发展，是中国人民的真诚愿望和不懈追求。中国外交政策的宗旨是______。 |
| question:2c453154fb | no-question-cue | 建设生态文明是中华民族永续发展的千年大计，关系人民和民族未来。生态文明的核心是______。 |
| question:2c453154fb | answer-missing | 建设生态文明是中华民族永续发展的千年大计，关系人民和民族未来。生态文明的核心是______。 |
| question:271970173e | no-question-cue | 科学发展观的核心立场是______。 |
| question:271970173e | answer-missing | 科学发展观的核心立场是______。 |
| question:a1b8d680d8 | no-question-cue | 民生是人民幸福之基、社会和谐之本。最大的民生是______。 |
| question:a1b8d680d8 | answer-missing | 民生是人民幸福之基、社会和谐之本。最大的民生是______。 |
| question:8960fc5d4d | no-question-cue | 提出到2020年全面建成小康社会奋斗目标的是______。 |
| question:8960fc5d4d | answer-missing | 提出到2020年全面建成小康社会奋斗目标的是______。 |
| question:23d5d928f1 | no-question-cue | 构建人类命运共同体思想，核心是"建设持久和平、普遍安全、共同繁荣、______的世界"。 |
| question:23d5d928f1 | answer-missing | 构建人类命运共同体思想，核心是"建设持久和平、普遍安全、共同繁荣、______的世界"。 |
| question:89b64e432d | no-question-cue | 从全面建设社会主义现代化国家进程的阶段安排来看，到2035年，我国将______。 |
| question:89b64e432d | answer-missing | 从全面建设社会主义现代化国家进程的阶段安排来看，到2035年，我国将______。 |
| question:95a7cfeaa2 | no-question-cue | 王毅在第61届慕尼黑安全会议"中国专场"上的主旨讲话表达看法，包括______ |
| question:6d934c5bb9 | no-question-cue | 习近平在听取西藏自治区党委和政府工作汇报时强调，西藏要扎实推动高质量发展，持续抓好关键大事，这些大事不仅关乎西藏自身发展，更涉及国家边疆稳定与生态安全，具体包括______ |
| question:9baa636678 | no-question-cue | 中国共产党与各民主党派合作的基本方针是______。 |
| question:9baa636678 | answer-missing | 中国共产党与各民主党派合作的基本方针是______。 |
| question:8044274ec1 | no-question-cue | 全面深化改革开放要坚持正确的方法论是______。 |
| question:a87c984ceb | no-question-cue | 共享发展注重的是解决社会公平正义问题，必须坚持______。 |
| question:a87c984ceb | answer-missing | 共享发展注重的是解决社会公平正义问题，必须坚持______。 |
| question:29b63a9460 | answer-missing | 公有制经济包括（ ） |
| question:d2d1e961e7 | no-question-cue | 中国特色社会主义新时代，______。 |
| question:e5f3e33db2 | no-question-cue | 全面小康有更高的标准、更丰富的内涵、更全面的要求，即：______。 |
| question:e5f3e33db2 | answer-missing | 全面小康有更高的标准、更丰富的内涵、更全面的要求，即：______。 |
| question:614c828c7b | no-question-cue | 我国基本分配制度是由我国______决定的。 |
| question:614c828c7b | answer-missing | 我国基本分配制度是由我国______决定的。 |
| question:da0b3ffd5f | no-question-cue | 加快建设法治中国，必须坚持______。 |
| question:da0b3ffd5f | answer-missing | 加快建设法治中国，必须坚持______。 |
| question:33b9cab36b | no-question-cue | 浙江大学脑机智能全国重点实验室近日发布新一代神经拟态类脑计算机，它的昵称是______。这是基于专用神经拟态芯片的类脑计算机，所支持的脉冲神经元规模超过 20 亿，神经突触超过千亿，其神经元数量已接近猕猴大脑规模。 |
| question:de2c37736a | no-question-cue | 为实现 2025 年经济目标，国家发展改革委将做到四个"加力"，不包括______。 |
| question:73b38ef83f | no-question-cue | 2025 年政府工作报告明确的今年经济增长预期目标是______。 |
| question:864775521c | no-question-cue | 总结了百年来中国共产党推进马克思主义中国化时代化的重大成就，阐释了马克思主义中国化时代化重大历史意义的会议是______。 |
| question:840f13778e | no-question-cue | 毛泽东在把统一战线、武装斗争、党的建设比作党在中国革命中战胜敌人的三个主要的法宝的著作是______。 |
| question:840f13778e | answer-missing | 毛泽东在把统一战线、武装斗争、党的建设比作党在中国革命中战胜敌人的三个主要的法宝的著作是______。 |
| question:bce6c16aae | no-question-cue | 党的二十大提出的"______"，是习近平新时代中国特色社会主义思想的世界观、方法论和贯穿其中的立场观点方法的重要体现。 |
| question:019dbf9c0f | no-question-cue | 党的思想路线中，最核心的内容是______。 |
| question:019dbf9c0f | answer-missing | 党的思想路线中，最核心的内容是______。 |
| question:68fdc397fb | no-question-cue | ______是国家安全的基础。 |
| question:53e52f5b69 | no-question-cue | ______是改善民生、实现发展成果由人民共享最重要最直接的方式。 |
| question:53e52f5b69 | answer-missing | ______是改善民生、实现发展成果由人民共享最重要最直接的方式。 |
| question:0cf6f18a0b | no-question-cue | _____坚持和发展中国特色社会主义的本质要求和重要保障。 |
| question:0cf6f18a0b | answer-missing | _____坚持和发展中国特色社会主义的本质要求和重要保障。 |
| question:66b055fc60 | no-question-cue | 全面建设社会主义现代化国家，______是根本。 |
| question:66b055fc60 | answer-missing | 全面建设社会主义现代化国家，______是根本。 |
| question:06b9bdf335 | no-question-cue | 坚持以______为宗旨推动构建人类命运共同体。 |
| question:06b9bdf335 | answer-missing | 坚持以______为宗旨推动构建人类命运共同体。 |
| question:a51b88aa3a | no-question-cue | 邓小平理论形成的历史根据是______。 |
| question:a51b88aa3a | answer-missing | 邓小平理论形成的历史根据是______。 |
| question:8f9290866c | no-question-cue | 标志着资本主义工商业的社会主义改造已经基本完成是实现了______。 |
| question:8f9290866c | answer-missing | 标志着资本主义工商业的社会主义改造已经基本完成是实现了______。 |
| question:8cae824927 | no-question-cue | 以下对中国共产党的性质阐释正确的是______。 |
| question:8cae824927 | answer-missing | 以下对中国共产党的性质阐释正确的是______。 |
| question:a0c2669af2 | no-question-cue | 习近平指出："一百年来，中国共产党团结带领中国人民进行的一切奋斗、一切牺牲、一切创造，归结起来就是一个主题：_____。" |
| question:a0c2669af2 | answer-missing | 习近平指出："一百年来，中国共产党团结带领中国人民进行的一切奋斗、一切牺牲、一切创造，归结起来就是一个主题：_____。" |
| question:2ae5e24a09 | no-question-cue | _____是全面建设社会主义现代化国家的首要任务，是遵循经济规律发展的必然要求。 |
| question:2ae5e24a09 | answer-missing | _____是全面建设社会主义现代化国家的首要任务，是遵循经济规律发展的必然要求。 |
| question:02296f8198 | no-question-cue | 党的十九大报告提出新时代党的建设总要求，突出______在党的建设中的重要地位。 |
| question:eee84ba430 | no-question-cue | 十八大进一步把______纳入到现代化建设布局里，形成了"五位一体"的建设布局。 |
| question:eee84ba430 | answer-missing | 十八大进一步把______纳入到现代化建设布局里，形成了"五位一体"的建设布局。 |
| question:319e5d41d1 | no-question-cue | 2025 年两会期间，关于民生保障的政策表述正确的有______。 |
| question:319e5d41d1 | answer-missing | 2025 年两会期间，关于民生保障的政策表述正确的有______。 |
| question:f16dcd5e68 | no-question-cue | 非公有制经济包括______。 |
| question:f16dcd5e68 | answer-missing | 非公有制经济包括______。 |
| question:d611ad07db | no-question-cue | 在当代中国，坚持科学发展就是______。 |
| question:d611ad07db | answer-missing | 在当代中国，坚持科学发展就是______。 |
| question:4413b76e81 | no-question-cue | 在半殖民地半封建的近代中国，占支配地位的两个主要矛盾是______。 |
| question:4413b76e81 | answer-missing | 在半殖民地半封建的近代中国，占支配地位的两个主要矛盾是______。 |
| question:63cfaa6a1c | no-question-cue | 1956 年底，三大改造的基本完成，我国社会经济结构发生了根本变化，已占绝对优势的是_____。 |
| question:63cfaa6a1c | answer-missing | 1956 年底，三大改造的基本完成，我国社会经济结构发生了根本变化，已占绝对优势的是_____。 |
| question:15922d87cb | no-question-cue | 党的领导是______。 |
| question:15922d87cb | answer-missing | 党的领导是______。 |
| question:7a783bfd30 | no-question-cue | 邓小平南方谈话中提出"三个有利于"标准______。 |
| question:7a783bfd30 | answer-missing | 邓小平南方谈话中提出"三个有利于"标准______。 |
| question:ff258457d7 | no-question-cue | 构建社会主义和谐社会的总要求______。 |
| question:ff258457d7 | answer-missing | 构建社会主义和谐社会的总要求______。 |
| question:21719dd102 | no-question-cue | 中国梦是______的梦，与世界各国人民的美好梦想相通。 |
| question:21719dd102 | answer-missing | 中国梦是______的梦，与世界各国人民的美好梦想相通。 |
| question:7bd17d34b3 | no-question-cue | 8 月 17 日，随着开挖直径 17.5 米的______盾构机刀盘破土而出，由济南城市建设集团投资建设、中铁十四局集团承建的济南市黄岗路黄河隧道盾构段掘进完成，这一世界最大直径水下盾构隧道顺利贯通。 |
| question:4d27473b30 | no-question-cue | 8 月 15 日至 17 日，第七届大运河文化旅游博览会在______举办，本届运博会延续______主题，坚持专业化、市场化和品牌化理念，努力为运河沿线省市及全国文旅行业搭建一个文旅融合发展、文旅精品推广、美好生活共享的综合平台。 |
| question:0ed2862476 | no-question-cue | 8 月 20 日，我国首个获得核准的沙戈荒新能源外送工程——______正负 800 千伏特高压直流工程投产送电。 |
| question:669cd18895 | no-question-cue | 《论十大关系》中，第一条关系是______。 |
| question:669cd18895 | answer-missing | 《论十大关系》中，第一条关系是______。 |
| question:6186a91f2a | no-question-cue | 社会主义初级阶段基本经济制度，既包括公有制经济，也包括非公有制经济。把非公有制经济纳入社会主义初级阶段基本经济制度中，是因为非公有制经济______。 |
| question:6186a91f2a | answer-missing | 社会主义初级阶段基本经济制度，既包括公有制经济，也包括非公有制经济。把非公有制经济纳入社会主义初级阶段基本经济制度中，是因为非公有制经济______。 |
| question:04e394cf7f | no-question-cue | 从中华人民共和国成立到社会主义改造基本完成，是我国从新民主主义到社会主义的过渡时期，这一时期，个体经济向社会主义集体经济过渡的形式是______。 |
| question:04e394cf7f | answer-missing | 从中华人民共和国成立到社会主义改造基本完成，是我国从新民主主义到社会主义的过渡时期，这一时期，个体经济向社会主义集体经济过渡的形式是______。 |
| question:5f07c2c672 | no-question-cue | "发展才是硬道理"、"发展是党执政兴国的第一要务"、"发展是解决中国一切问题的总钥匙"，这是对社会主义建设历史经验的深刻总结。中国解决所有问题的关键是要靠自己的发展，而发展的根本目的是______。 |
| question:5f07c2c672 | answer-missing | "发展才是硬道理"、"发展是党执政兴国的第一要务"、"发展是解决中国一切问题的总钥匙"，这是对社会主义建设历史经验的深刻总结。中国解决所有问题的关键是要靠自己的发展，而发展的根本目的是______。 |
| question:f06bb2c566 | no-question-cue | 科学发展观所说的以人为本是______。 |
| question:f06bb2c566 | answer-missing | 科学发展观所说的以人为本是______。 |
| question:c911607fff | no-question-cue | 中国共产党一经诞生，就把为中国人民谋幸福，为中华民族谋复兴确立为自己的初心使命。一百年来，中国共产党团结带领中国人民进行的一切奋斗、一切牺牲、一切创造，归结起来就是一个主题______。 |
| question:c911607fff | answer-missing | 中国共产党一经诞生，就把为中国人民谋幸福，为中华民族谋复兴确立为自己的初心使命。一百年来，中国共产党团结带领中国人民进行的一切奋斗、一切牺牲、一切创造，归结起来就是一个主题______。 |
| question:1904060796 | no-question-cue | 当前和今后一个时期，我国经济发展面临的问题，供给和需求两侧都有，但矛盾的主要方面在______。 |
| question:1904060796 | answer-missing | 当前和今后一个时期，我国经济发展面临的问题，供给和需求两侧都有，但矛盾的主要方面在______。 |
| question:f53c6f1be6 | no-question-cue | 毛泽东思想和中国特色社会主义理论体系是马克思主义中国化时代化的两大理论成果，贯穿这两大理论成果始终，并体现在两大成果各个基本观点中的世界观和方法论的基础是______。 |
| question:f53c6f1be6 | answer-missing | 毛泽东思想和中国特色社会主义理论体系是马克思主义中国化时代化的两大理论成果，贯穿这两大理论成果始终，并体现在两大成果各个基本观点中的世界观和方法论的基础是______。 |
| question:9446d0d47e | no-question-cue | 人民政协工作要围绕______两大主题，把协商民主贯穿政治协商、民主监督、参政议政全过程。 |
| question:9446d0d47e | answer-missing | 人民政协工作要围绕______两大主题，把协商民主贯穿政治协商、民主监督、参政议政全过程。 |
| question:3d96e82a6e | no-question-cue | 习近平强调，党的______是党的根本性建设，决定党的建设方向和效果。 |
| question:3d96e82a6e | answer-missing | 习近平强调，党的______是党的根本性建设，决定党的建设方向和效果。 |
| question:0494028c10 | no-question-cue | 坚持总体国家安全观的宗旨是______。 |
| question:0494028c10 | answer-missing | 坚持总体国家安全观的宗旨是______。 |
| question:dc4314282f | no-question-cue | 我国在奉行独立自主的和平外交政策过程中，应当放在首位的是______。 |
| question:dc4314282f | answer-missing | 我国在奉行独立自主的和平外交政策过程中，应当放在首位的是______。 |
| question:61cabef925 | no-question-cue | 建设生态文明是中华民族永续发展的千年大计，关系人民福祉，关乎民族未来，功在当代、利在千秋。生态文明的核心是______。 |
| question:61cabef925 | answer-missing | 建设生态文明是中华民族永续发展的千年大计，关系人民福祉，关乎民族未来，功在当代、利在千秋。生态文明的核心是______。 |
| question:ff21eb37ae | no-question-cue | 习近平新时代中国特色社会主义思想的核心要义是______。 |
| question:ff21eb37ae | answer-missing | 习近平新时代中国特色社会主义思想的核心要义是______。 |
| question:f2c0eedc4a | no-question-cue | 伟大斗争、伟大工程、伟大事业、伟大梦想是一个紧密联系、相互贯通、相互作用、有机统一的整体，统一于新时代坚持和发展中国特色社会主义伟大实践。其中开辟前进道路的是______。 |
| question:02898553c7 | no-question-cue | 民主集中制是中国共产党根本的______。 |
| question:02898553c7 | answer-missing | 民主集中制是中国共产党根本的______。 |
| question:73414de39d | answer-missing | 党的二十大报告指出，马克思主义是我们立党立国、兴党兴国的根本指导思想。实践告诉我们，中国共产党为什么能，中国特色社会主义为什么好，归根到底是______。 |
| question:6f984bcb20 | no-question-cue | 习近平新时代中国特色社会主义思想是当代中国马克思主义、二十一世纪马克思主义，是______的时代精华，实现了马克思主义中国化新的飞跃。 |
| question:6f984bcb20 | answer-missing | 习近平新时代中国特色社会主义思想是当代中国马克思主义、二十一世纪马克思主义，是______的时代精华，实现了马克思主义中国化新的飞跃。 |
| question:27c7ffaa1a | no-question-cue | 在进行社会主义改造、向社会主义过渡的进程中，中国共产党积累了丰富的历史经验，其中包括______。 |
| question:27c7ffaa1a | answer-missing | 在进行社会主义改造、向社会主义过渡的进程中，中国共产党积累了丰富的历史经验，其中包括______。 |
| question:b0c7f1aad7 | no-question-cue | 20 世纪末，我们已经胜利实现了现代化建设"三步走"战略的第一步、第二步目标，人民生活总体上达到小康水平。这是社会主义制度的伟大胜利，是中华民族发展史上一个新的里程碑。但是，这个小康还是______。 |
| question:b0c7f1aad7 | answer-missing | 20 世纪末，我们已经胜利实现了现代化建设"三步走"战略的第一步、第二步目标，人民生活总体上达到小康水平。这是社会主义制度的伟大胜利，是中华民族发展史上一个新的里程碑。但是，这个小康还是______。 |
| question:773be505ae | no-question-cue | 我国经济发展新常态的主要特征：______。 |
| question:773be505ae | answer-missing | 我国经济发展新常态的主要特征：______。 |
| question:f05bd170e5 | no-question-cue | 在"一国两制"的构想中，______。 |
| question:f05bd170e5 | answer-missing | 在"一国两制"的构想中，______。 |
| question:7c051cccfb | no-question-cue | 毛泽东指出，敌我矛盾和人民内部矛盾的性质和解决方法分别是______。 |
| question:7c051cccfb | answer-missing | 毛泽东指出，敌我矛盾和人民内部矛盾的性质和解决方法分别是______。 |
| question:f6233502fb | no-question-cue | 加强党的先进性建设，必须______。 |
| question:f6233502fb | answer-missing | 加强党的先进性建设，必须______。 |
| question:75564e106d | no-question-cue | 社会主义初级阶段党的基本路线中的"两个基本点"是指______。 |
| question:75564e106d | answer-missing | 社会主义初级阶段党的基本路线中的"两个基本点"是指______。 |
| question:1fc784d8ce | no-question-cue | 社会主义市场经济理论的要点有______。 |
| question:1fc784d8ce | answer-missing | 社会主义市场经济理论的要点有______。 |
| question:82eee19d77 | same-question-answer | question:600b3f35c5 |
| question:8caebc934a | same-question-answer | question:7f93f9c208 |
| question:1e838cbd54 | same-question-answer | question:6799136fef |
| question:d0cd7ea4c2 | same-question-answer | question:825738c584 |
| question:862987c602 | same-question-answer | question:7b6ca9494c |
| question:e9ada52021 | same-question-answer | question:3f57490b19 |
| question:49c2478157 | same-question-answer | question:a2dc7be392 |
| question:130d9251d1 | same-question-answer | question:89b566d636 |
| question:eeb899d01f | same-question-answer | question:548840d6fc |
| question:bcbb066f94 | same-question-answer | question:32eb07bca9 |
| question:c89ca2cf08 | same-question-answer | question:9b55aa921d |
| question:6df527fb38 | same-question-answer | question:37ae1a31d9 |
| question:79c349b299 | same-question-answer | question:7815250541 |
| question:230dbea43a | same-question-answer | question:e8e0f2af94 |
| question:4cb0c27df9 | same-question-answer | question:556044f7dd |
| question:925b6ab437 | same-question-answer | question:c28bfe755f |
| question:69c057c816 | same-question-answer | question:ba88baebde |
| question:91888378a0 | same-question-answer | question:e93e6c89dc |
| question:3ef9c3c806 | same-question-answer | question:25e7524d8c |
| question:070f115f1b | same-question-answer | question:f06944c766 |
| question:2e93585044 | same-question-answer | question:9756690178 |
| question:98520cd0b4 | same-question-answer | question:a85e72d0a5 |
| question:78a32384b7 | same-question-answer | question:bf9b7d8b58 |
| question:8b85dd0fd0 | same-question-answer | question:bb4b8c54ad |
| question:3c949a4894 | same-question-answer | question:1fffe326f3 |
| question:ca061c38e1 | same-question-answer | question:678b6967a1 |
| question:665a2ceec9 | same-question-answer | question:9eb82a2cb2 |
| question:aa9da0ab7b | same-question-answer | question:2c71a1d4be |
| question:fc6851c093 | same-question-answer | question:7d62668cd2 |
| question:a9fe5f8cc0 | same-question-answer | question:d18611b696 |
| question:3b09acea45 | same-question-answer | question:0b947ef9a5 |
| question:50a7b0d21e | same-question-answer | question:367e77d7f6 |
| question:bf442838dc | same-question-answer | question:a559eb12ce |
| question:692b524bc3 | same-question-answer | question:4b6225cbd9 |
| question:5b630c24dd | same-question-answer | question:012b315a14 |
| question:3edf986c2e | same-question-answer | question:1e960555db |
| question:cefe5558e2 | same-question-answer | question:102907ae97 |
| question:6482d127ed | same-question-answer | question:49089f16e7 |
| question:a680bd85d0 | same-question-answer | question:51a021a928 |
| question:2fdcb0d2d2 | same-question-answer | question:7b062c0d47 |
| question:9b499fafd3 | same-question-answer | question:f60422d44b |
| question:1637587f80 | same-question-answer | question:63354e119f |
| question:b504ca13ec | same-question-answer | question:8fb616197b |
| question:f2be862bd2 | same-question-answer | question:33724a45f0 |
| question:818d6a483f | same-question-answer | question:048b0a8e72 |
| question:5dc024c226 | same-question-answer | question:67292dfc8a |
| question:f2fb26751b | same-question-answer | question:d8516e3df8 |
| question:f685dfc5a6 | same-question-answer | question:68dc553bc3 |
| question:d771a7f8fd | same-question-answer | question:61fd5feb87 |
| question:7bd17d34b3 | same-question-answer | question:59e47ab1f7 |

## 事实纠正的核验来源

- 卡片 2c98eb2e12：
  - [百团大战处于战略相持阶段。](https://m.ccdi.gov.cn/content/bf/ed/5404.html)
- 卡片 615e74bffb：
  - [蛟龙首次北极冰区深潜；母船为深海一号。](https://zrzyt.xinjiang.gov.cn/xjgtzy/mtxc/202510/bbbc8a6906264c049b0ac175408cd3ea.shtml)
  - [探索三号与奋斗者实现密集冰区连续载人深潜。](https://idsse.cas.cn/xwdt/ywdt/202510/t20251030_7999857.html)
- 卡片 92f5dcab71：
  - [2025年2月原计划。](https://spa.gov.sa/en/N2259921)
  - [IOC于2025年10月30日发布的终止合作声明。](https://www.thenewsmarket.com/news/ioc-statement-on-the-olympic-esports-games/s/7d19d2f6-463d-4a53-a8f9-43bb4a4ba379)

## 仍需明确的边界

- 原始题库中标记缺答案或存疑的题，不猜答案，不进入无依据的自动判分；上述扫描会持续列出。
- 手机持续空白尚未稳定复现；已有浏览器布局、状态、监听器测试与调试字段，不能据此宣称特定手机故障根因已证明。
