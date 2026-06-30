import type { Story, Scene, Branch, Character, StoryEvent, Draft } from "@/types";

// ============================================================
// Mock Data — for MVP UI development without database
// ============================================================

/** A rich fantasy story to demonstrate Story OS capabilities */
export const mockStory: Story = {
  id: "story-001",
  userId: "default",
  title: "烬海纪元",
  description:
    "在魔法与蒸汽共存的世界里，一位被放逐的学者发现古老文明的毁灭并非天灾，而是一场精心策划的谋杀——而同样的命运正悄然逼近当代。",
  genre: "奇幻, 蒸汽朋克, 悬疑",
  worldSetting:
    "世界「艾泽拉」经历了三次魔法纪元。当前是第四纪元——蒸汽纪元。魔法被视为迷信，但古老的力量正在觉醒。",
  status: "active",
  createdAt: "2026-05-01T10:00:00Z",
  updatedAt: "2026-06-20T18:30:00Z",
};

export const mockBranches: Branch[] = [
  {
    id: "branch-001",
    storyId: "story-001",
    name: "主线",
    description: "主线叙事线 — 卡娅独自调查真相",
    branchType: "mainline",
    parentBranchId: null,
    createdAt: "2026-05-01T10:00:00Z",
  },
  {
    id: "branch-002",
    storyId: "story-001",
    name: "IF线 — 卡娅的选择",
    description: "如果卡娅选择接受维伦的帮助，与他联手的平行叙事",
    branchType: "what_if",
    parentBranchId: "branch-001",
    createdAt: "2026-06-01T12:00:00Z",
  },
  {
    id: "branch-003",
    storyId: "story-001",
    name: "支线 — 守望者遗产",
    description: "探索守望者埃林留下的其他线索（可在主线中穿插）",
    branchType: "side_story",
    parentBranchId: "branch-001",
    createdAt: "2026-06-15T08:00:00Z",
  },
];

export const mockScenes: Scene[] = [
  {
    id: "scene-001",
    storyId: "story-001",
    branchId: "branch-001",
    parentSceneId: null,
    title: "第一章 · 灰烬中的发现",
    content: `雨水顺着破碎的穹顶滴落，在石板地面上汇成一面镜子般的浅潭。

卡娅蹲在齐腰深的废墟中，手指轻轻拂过一块刻满符文的石板。三周前，这片遗址还深埋在沙漠之下。一场地震将它重新带回了地面——带着一个死去了三千年的文明的最后遗言。

"这不是自然磨损。"

她抬起头，透过残破的拱门望向远处的学院飞艇。银白色的船体在夕阳下反射着冷光。没人相信她的发现。历史学院已经认定：第三纪元的终结是一场魔法失控引发的天灾。教科书上写得清清楚楚。

但石板上的符文告诉她另一件事。

它们是被一种精确的、有针对性的力量抹去的——不是天灾。是人。是一个组织。他们成功了。而根据她在第二块石板上的解读，他们没有消失。他们只是在等待下一次时机。

卡娅用手背抹去额头的汗水，指尖仍在微微颤抖。石板上最后一个未被损坏的符文由古老的奥术语言写成，但意思清晰：

"当双月再度重合，第二次净化将开始。"

她抬头望向天空。双月重合的夜晚，距离现在，还有二十一天。`,
    summaryShort: "卡娅在废墟中发现古老文明并非毁于天灾，而是被一个组织蓄意毁灭，并发现二十一天后他们将再次行动。",
    summaryLong:
      "学者卡娅在沙漠地震后暴露的第三纪元遗址中发现了关键证据：石板上的符文是被精确力量抹去的，而非教科书中所说的魔法失控天灾。她解读出最后的符文警告——当双月重合时，一个存活了三千年的组织将发动第二次'净化'。距离双月重合还有二十一天，但学院高层拒绝相信她的发现。",
    sortOrder: 1,
    status: "canon",
    wordCount: 380,
    factsAdded: [
      { key: "卡娅", value: "学院学者，专攻第三纪元文明", category: "character" },
      { key: "艾泽拉", value: "故事世界，经历三次魔法纪元，当前为蒸汽纪元", category: "world" },
      { key: "第三纪元终结", value: "表面上是魔法失控天灾，实为组织蓄意毁灭", category: "history" },
      { key: "双月重合", value: "下一次双月重合在二十一天后，将触发第二次'净化'", category: "plot" },
    ],
    openThreads: [
      { description: "毁灭第三纪元的组织到底是什么？", status: "open" },
      { description: "第二次'净化'意味着什么？", status: "open" },
    ],
    meta: {},
    createdAt: "2026-05-01T12:00:00Z",
    updatedAt: "2026-05-10T15:00:00Z",
  },
  {
    id: "scene-002",
    storyId: "story-001",
    branchId: "branch-001",
    parentSceneId: "scene-001",
    title: "第二章 · 学院阴影",
    content: `学院图书馆的钟声敲了九下。

卡娅将拓印的符文纸在长桌上铺开，蜡烛的光晕在纸张边缘跳动。她已经连续工作了六个小时，将石板上的符文与已知的第三纪元文献一一比对。

结果令人不安。

至少有十二处记载被篡改过。不是粗劣的涂改——是专业级别的重写，原作者的口吻被完美保留，但核心事实被悄无声息地替换了。

"我就知道你会在这儿。"

卡娅猛地抬头。门口站着一个瘦高的男人，学院制服的银色肩章在暗处闪光——维伦·阿什顿，档案部的首席管理员。也是她申请调阅一级文献时，每次都恰好"找不到"的那个人。

"还在研究你的废墟？"维伦的语气轻松得不太自然。"学术委员会已经驳回了你的复查申请。休息一下吧，卡娅。有些石头……最好还是让它们留在沙子里。"

他说最后一句话时，笑意没有到达眼睛。

卡娅的手指扣紧了符文纸的边缘。她注意到维伦的袖口露出一小截深蓝色的刺青——一个她在一级文献插图里见过的符号。第三纪元的禁忌符号。一个不应该出现在任何活人身上的印记。`,
    summaryShort: "卡娅发现学院文献被专业篡改，档案部首席维伦行为可疑，身上带有第三纪元的禁忌刺青。",
    summaryLong:
      "卡娅在图书馆连夜比对符文拓片与文献，发现有十二处记载被专业级篡改。档案部首席维伦·阿什顿的出现暗示了学院内部的阻碍——他不仅一直在阻止她调阅一级文献，还露出一截属于第三纪元的禁忌刺青。卡娅意识到这张网远比她想象的大。",
    sortOrder: 2,
    status: "canon",
    wordCount: 350,
    factsAdded: [
      { key: "维伦·阿什顿", value: "档案部首席管理员，身上有第三纪元禁忌刺青，可能在掩盖真相", category: "character" },
      { key: "文献篡改", value: "学院一级文献中有十二处被专业级篡改，涉及第三纪元关键记载", category: "plot" },
      { key: "禁忌刺青", value: "第三纪元的标记，理论上不应出现在任何活人身上", category: "world" },
    ],
    openThreads: [
      { description: "维伦属于哪个组织？学院被渗透到什么程度？", status: "open" },
    ],
    meta: {},
    createdAt: "2026-05-11T10:00:00Z",
    updatedAt: "2026-05-20T14:00:00Z",
  },
  {
    id: "scene-003",
    storyId: "story-001",
    branchId: "branch-001",
    parentSceneId: "scene-002",
    title: "第三章 · 地下档案馆",
    content: `维伦离开后，卡娅第一反应是收拾符文纸逃走。但她的理性——那个曾让她以最高荣誉毕业的理性——压过了恐惧。

如果维伦在阻止真相被揭露，那么他守住的一定不只是几份文献。

图书馆的地下三层是封闭区。官方说法是"结构不稳定"。但卡娅注意到维伦每周四都会独自下去，带着一盏提灯。

她等到走廊空了，用一枚偷藏的钥匙打开了通往地下的铁门。

石阶向下延伸了很长一段。空气越来越冷，带着铁锈和旧纸的气味。当她终于到达底层时，她看到的是——书架。一眼望不到头的书架。上面的卷宗标签显示着她在官方索引中从未见过的编号。

第三纪元原本文献。不是删改版。不是"审核后"公开版。是原文。

而最角落的书架上，一排皮面日志引起了她的注意。日志的主人是一个叫"守望者埃林"的人。最后一册的末页只写了一行字：

"我们已经确定了他们的名字。如果你们找到这本日志，记住——他们不是消失了。他们只是改了一个名字。他们现在叫——"

余下的内容被撕掉了。

但在这行字的下面，有人用近期的墨水——也许是几个月前——添了一笔：

"他们现在叫'炽天使学会'。而他们的下一次净化，就在这个时代。"

字迹是维伦的。`,
    summaryShort: "卡娅潜入地下档案馆，发现未被篡改的原文文献和守望者日志，日志指出毁灭第三纪元的组织现在叫'炽天使学会'，备注是维伦所写。",
    summaryLong:
      "卡娅趁夜潜入学院地下封闭区，发现了一个秘密档案馆，藏有未被篡改的第三纪元原本文献。她找到守望者埃林的日志——埃林在三千年前记录了这个组织的真相。末页被人撕毁，但下方有人（笔迹确认是维伦）添加了备注：组织现在的名字是'炽天使学会'，他们正在准备这个时代的净化。维伦的身份变得复杂——他究竟是敌人，还是潜伏在敌人内部的人？",
    sortOrder: 3,
    status: "canon",
    wordCount: 400,
    factsAdded: [
      { key: "炽天使学会", value: "从第三纪元存活至今的秘密组织，策划了第三次纪元的终结，正在准备这个时代的'净化'", category: "organization" },
      { key: "守望者埃林", value: "第三纪元的知情者，记录了组织的真相", category: "character" },
      { key: "地下档案馆", value: "学院地下保存着未被篡改的第三纪元原本文献", category: "location" },
      { key: "维伦的真面目", value: "维伦的笔记暗示他可能在对抗炽天使学会，而非协助他们", category: "character" },
    ],
    openThreads: [
      { description: "维伦究竟是敌人还是暗中帮助者？", status: "hinted" },
      { description: "炽天使学会的'净化'具体是什么？", status: "open" },
      { description: "被撕掉的日志内容是什么？", status: "open" },
    ],
    meta: {},
    createdAt: "2026-05-21T09:00:00Z",
    updatedAt: "2026-06-01T11:00:00Z",
  },
  {
    id: "scene-004",
    storyId: "story-001",
    branchId: "branch-002",
    parentSceneId: "scene-002",
    title: "IF · 卡娅的选择",
    content: `维伦离开后，卡娅发现自己站在一个岔路口——字面意义上，也是隐喻意义上。

正门通往出口。侧廊通往地下。

但此刻又多了一个选择：她的手中攥着一张维伦在转身时塞进她掌心的纸条。"如果你想知道真相，明天日落时分，铁桥下的旧船屋。不要告诉任何人。"

她没有去地下档案馆。

第二天日落时分，卡娅站在旧船屋斑驳的木门前。空气里混着河水的腥味和煤油灯的气味。门无声地开了。

维伦站在里面。没有穿学院制服。袖口的刺青完整地露了出来。

"你比我想的聪明，"他说。"来，把门关上。我要告诉你一个从第三纪元活到现在的组织的真相——以及为什么我花了二十年伪装成他们中的一员。"

他递给她一杯热茶。

"坐下吧，卡娅。这是个很长的故事。而这只是第一个夜晚。"`,
    summaryShort: "卡娅选择接住维伦的纸条，在船屋与他见面。维伦坦白自己是潜伏在炽天使学会中的卧底。",
    summaryLong:
      "不同于主线中卡娅独自潜入地下档案馆，在这个分支中她选择回应维伦的暗示。维伦在学院制服下隐藏了真相：他花了二十年时间伪装成炽天使学会的成员，实际是在收集情报。分支开启了一个与主线截然不同的可能性——卡娅将拥有一个深谙内情的盟友，但也将面临更大的暴露风险。",
    sortOrder: 4,
    status: "alternative",
    wordCount: 300,
    factsAdded: [
      { key: "维伦是卧底", value: "维伦花了二十年潜入炽天使学会，伪装成他们的成员", category: "character" },
      { key: "船屋", value: "维伦的秘密据点，位于铁桥下的旧船屋", category: "location" },
    ],
    openThreads: [
      { description: "维伦掌握了炽天使学会的什么情报？", status: "open" },
      { description: "卡娅选择与维伦合作，这意味着主线走向将被完全改变", status: "open" },
    ],
    meta: {},
    createdAt: "2026-06-02T14:00:00Z",
    updatedAt: "2026-06-15T10:00:00Z",
  },
];

export const mockCharacters: Character[] = [
  {
    id: "char-001",
    storyId: "story-001",
    userId: "default",
    name: "卡娅·艾尔文",
    aliases: "废墟学者, 灰烬行者",
    description: "学院历史系学者，专攻第三纪元文明。被同僚视为偏执的异类，但她的理论往往最终被证明正确。",
    appearance: "三十岁出头，深棕色卷发常因工作而凌乱，手指上总有墨水和泥土的痕迹。灰色眼睛在专注时格外锐利。",
    personality: "执着到固执，智商极高但不擅政治，在权威面前常吃暗亏。对真相有近乎饥渴的追求。",
    background: "出生于蒸汽机工匠家庭，凭借奖学金进入学院。父亲在她十五岁时因'魔法相关事故'去世——官方结论，但她始终怀疑。",
    motivations: "找出父亲死亡的真相；揭开第三纪元灭亡的真正原因；阻止即将到来的灾难",
    relationships: [
      { characterId: "char-002", characterName: "维伦·阿什顿", relation: "可疑的盟友，信任待验证" },
    ],
    notes: "主角。第三块石板揭示她可能与第三纪元的守望者有血缘关系。（待展开）",
    isMajor: true,
    createdAt: "2026-05-01T12:00:00Z",
    updatedAt: "2026-05-01T12:00:00Z",
  },
  {
    id: "char-002",
    storyId: "story-001",
    userId: "default",
    name: "维伦·阿什顿",
    aliases: "档案部的幽灵",
    description: "学院档案部首席管理员。表面上是一个刻板的官僚，实则在暗中操控文献的可及性。",
    appearance: "四十岁左右，高瘦，深色头发整齐后梳。学院制服永远一丝不苟。微笑从不到达眼睛。左手腕内侧有深蓝色禁忌刺青。",
    personality: "极度谨慎，话里有话。表面上冷漠中立，但每个行动都有精确的计算。可能是敌人，可能不是。",
    background: "未知。官方档案中他在二十年前加入学院，但之前的履历全是空白。",
    motivations: "不明确。他自己声称在对抗炽天使学会，但无法证实。",
    relationships: [
      { characterId: "char-001", characterName: "卡娅·艾尔文", relation: "暗中关注的对象" },
    ],
    notes: "关键配角。第二章暗示他身上有禁忌刺青，第三章的日志笔记暗示他在反制炽天使学会。真相待揭晓。",
    isMajor: true,
    createdAt: "2026-05-11T10:00:00Z",
    updatedAt: "2026-05-20T14:00:00Z",
  },
  {
    id: "char-003",
    storyId: "story-001",
    userId: "default",
    name: "守望者埃林",
    aliases: "最后的守望者",
    description: "第三纪元末期的人物，记录了炽天使学会的真相。已死三千年。",
    appearance: "未知。仅通过日志文字存在。",
    personality: "根据日志判断：谨慎、有远见、善于隐藏信息。可能预见到自己会被灭口。",
    background: "第三纪元的一名守望者——一个监视魔法平衡的古老组织成员。他发现了炽天使学会的存在并试图留下记录。",
    motivations: "揭露真相，为未来世代留下警告",
    relationships: [],
    notes: "历史人物，不会直接出场。他的日志是关键线索物品。",
    isMajor: false,
    createdAt: "2026-05-21T09:00:00Z",
    updatedAt: "2026-05-21T09:00:00Z",
  },
];

export const mockEvents: StoryEvent[] = [
  {
    id: "event-001",
    storyId: "story-001",
    sceneId: "scene-001",
    title: "卡娅发现第三纪元石板",
    description: "在沙漠地震暴露的废墟中，卡娅发现刻有警告符文的第三纪元石板。",
    eventTime: "第四纪元 847 年，秋，双月重合前二十一天",
    eventOrder: 1,
    createdAt: "2026-05-01T12:00:00Z",
  },
  {
    id: "event-002",
    storyId: "story-001",
    sceneId: "scene-002",
    title: "卡娅发现文献篡改",
    description: "在图书馆比对符文拓片时，发现十二处一级文献被专业级别篡改。",
    eventTime: "第四纪元 847 年，秋，同日夜晚",
    eventOrder: 2,
    createdAt: "2026-05-11T10:00:00Z",
  },
  {
    id: "event-003",
    storyId: "story-001",
    sceneId: "scene-003",
    title: "卡娅潜入地下档案馆",
    description: "发现未被篡改的原文和守望者埃林的日志，确认炽天使学会仍然存在。",
    eventTime: "第四纪元 847 年，秋，同日深夜",
    eventOrder: 3,
    createdAt: "2026-05-21T09:00:00Z",
  },
];

export const mockDrafts: Draft[] = [
  {
    id: "draft-001",
    sceneId: "scene-004-placeholder",
    userId: "default",
    content: `月光从船屋的破窗洒进来，在维伦脸上画出一道道银色的条纹。

"你需要理解的第一件事，"他说，声音低沉而平稳，"是炽天使学会并非宗教组织。他们是学者。三千年前最聪明的学者。他们发现了某种他们称之为'源火'的东西——一种超越魔法的力量。而使用它的代价，是每次都会腐蚀使用者的灵魂。"

他挽起袖子，露出完整的刺青。在烛光下，那深蓝色的纹路似乎在缓缓移动。

"这个刺青不是装饰。是封印。它阻止源火感知到我的存在。"他顿了顿。"我在学会里待了二十年。二十年。我清楚他们的每一步计划。而双月重合之夜，他们要从艾泽拉的心脏——"

一道尖锐的哨声从河对岸传来。

维伦的脸瞬间变得苍白。"他们找到我了。快走。从后门——现在！"

他一把抓住卡娅的手腕，将她推向黑暗的走廊。`,
    aiAction: "continue",
    aiModel: "deepseek-v4-flash",
    aiPrompt: "续写卡娅与维伦在船屋的对话，揭示更多关于炽天使学会的信息，并以危机转折结束。",
    status: "draft",
    wordCount: 280,
    createdAt: "2026-06-20T18:00:00Z",
    confirmedAt: null,
    rejectedAt: null,
  },
];

// --- Aggregate helpers ---

export function getStoryWithScenes(): { story: Story; scenes: Scene[]; branches: Branch[] } {
  return {
    story: mockStory,
    scenes: mockScenes,
    branches: mockBranches,
  };
}

export function getScenesByBranch(branchId: string): Scene[] {
  return mockScenes
    .filter((s) => s.branchId === branchId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getCharactersByStory(storyId: string): Character[] {
  return mockCharacters.filter((c) => c.storyId === storyId);
}

export function getEventsByStory(storyId: string): StoryEvent[] {
  return mockEvents
    .filter((e) => e.storyId === storyId)
    .sort((a, b) => a.eventOrder - b.eventOrder);
}

/** All stories for the story list */
export const mockStories: Story[] = [
  mockStory,
  {
    id: "story-opc",
    userId: "default",
    title: "OPC创业手记：从零到一的 SaaS 之旅",
    description: "独立开发者陈宇辞去大厂工作，用六个月时间从零构建AI写作工具「笔灵」。这是一个关于勇气、孤独和坚持的真实创业记录。",
    genre: "创业, 科技, 励志",
    worldSetting: "2026年的北京，AI技术井喷式发展。独立开发者在夹缝中寻找生存空间。",
    status: "active",
    createdAt: "2026-06-01T08:00:00Z",
    updatedAt: "2026-06-30T20:00:00Z",
  },
];
