/* 由 pipeline/joint.js 生成，勿手改 —— schema gi-joint/1 ｜ 数据截至 2026-10-29T03:55:44 */
(function (root) {
  var data = {
    "schema": "gi-joint/1",
    "generatedAt": "2026-10-29T03:55:44",
    "kpDictVersion": 72,
    "exams": [
      {
        "examId": "ex-2026-10-10",
        "name": "高一上第一次月考",
        "date": "2026-10-10",
        "source": "details/高一/上学期/10月/data/exam.json",
        "transcribedAt": "2026-10-29T03:55:44",
        "subjects": {
          "chinese": {
            "name": "语文",
            "score": 111,
            "full": 150,
            "hasCause": false,
            "causeCoverage": {
              "confirmed": 0,
              "total": 12
            },
            "causes": null,
            "kps": [],
            "wrongQuestions": [
              {
                "no": 1,
                "type": "单选题",
                "point": 3,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 5,
                "type": "单选题",
                "point": 3,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 12,
                "type": "多选题",
                "point": 3,
                "score": 2,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 13,
                "type": "主观题",
                "point": 4,
                "score": 3,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 15,
                "type": "主观题",
                "point": 6,
                "score": 4,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 16,
                "type": "主观题",
                "point": 8,
                "score": 5,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 17,
                "type": "主观题",
                "point": 3,
                "score": 2,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 18,
                "type": "主观题",
                "point": 6,
                "score": 4,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 19,
                "type": "主观题",
                "point": 12,
                "score": 5,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 20,
                "type": "主观题",
                "point": 6,
                "score": 4,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 21,
                "type": "主观题",
                "point": 3,
                "score": 2,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 22,
                "type": "作文题",
                "point": 60,
                "score": 47,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              }
            ]
          },
          "math": {
            "name": "数学",
            "score": 80,
            "full": 150,
            "hasCause": true,
            "causeCoverage": {
              "confirmed": 10,
              "total": 10
            },
            "causes": {
              "C1": 2,
              "C2": 47,
              "C3": 0,
              "C4": 0,
              "C5": 16,
              "C6": 5
            },
            "kps": [
              {
                "kpKey": "math::函数的对称性",
                "kpId": "kp-0001",
                "name": "函数的对称性",
                "rate": 0,
                "wrong": 1,
                "key": false,
                "cat": "薄弱",
                "qNos": [
                  8
                ]
              },
              {
                "kpKey": "math::多面体和旋转体表面上的最短距离问题",
                "kpId": "kp-0002",
                "name": "【重点】多面体和旋转体表面上的最短距离问题",
                "rate": 0,
                "wrong": 1,
                "key": true,
                "cat": "薄弱",
                "qNos": []
              },
              {
                "kpKey": "math::利用函数的单调性解不等式",
                "kpId": "kp-0003",
                "name": "利用函数的单调性解不等式",
                "rate": 0,
                "wrong": 1,
                "key": false,
                "cat": "薄弱",
                "qNos": [
                  8
                ]
              },
              {
                "kpKey": "math::平面与平面所成角的向量求法",
                "kpId": "kp-0004",
                "name": "【重点】平面与平面所成角的向量求法",
                "rate": 0,
                "wrong": 1,
                "key": true,
                "cat": "考查",
                "qNos": [
                  18
                ]
              },
              {
                "kpKey": "math::圆与圆的位置关系",
                "kpId": "kp-0005",
                "name": "圆与圆的位置关系",
                "rate": 0,
                "wrong": 1,
                "key": false,
                "cat": "考查",
                "qNos": [
                  13
                ]
              },
              {
                "kpKey": "math::求圆的标准方程",
                "kpId": "kp-0006",
                "name": "求圆的标准方程",
                "rate": 0,
                "wrong": 1,
                "key": false,
                "cat": "考查",
                "qNos": [
                  13
                ]
              },
              {
                "kpKey": "math::辅助角公式(三角函数的叠加及应用(北师))",
                "kpId": "kp-0007",
                "name": "辅助角公式(三角函数的叠加及应用（北师）)",
                "rate": 0,
                "wrong": 1,
                "key": false,
                "cat": "考查",
                "qNos": [
                  13
                ]
              },
              {
                "kpKey": "math::空间向量的数量积与空间向量的垂直关系",
                "kpId": "kp-0008",
                "name": "【重点】空间向量的数量积与空间向量的垂直关系",
                "rate": 0,
                "wrong": 1,
                "key": true,
                "cat": "考查",
                "qNos": [
                  18
                ]
              },
              {
                "kpKey": "math::等差数列前n项和的最值问题",
                "kpId": "kp-0009",
                "name": "等差数列前n项和的最值问题",
                "rate": 0,
                "wrong": 1,
                "key": false,
                "cat": "考查",
                "qNos": [
                  14
                ]
              },
              {
                "kpKey": "math::二面角",
                "kpId": "kp-0010",
                "name": "二面角",
                "rate": 0,
                "wrong": 1,
                "key": false,
                "cat": "薄弱",
                "qNos": []
              },
              {
                "kpKey": "math::离散型随机变量的均值(期望)",
                "kpId": "kp-0011",
                "name": "离散型随机变量的均值（期望）",
                "rate": 0,
                "wrong": 1,
                "key": false,
                "cat": "薄弱",
                "qNos": [
                  19
                ]
              },
              {
                "kpKey": "math::空间几何体的截面问题(截面形状、面积)",
                "kpId": "kp-0012",
                "name": "空间几何体的截面问题（截面形状、面积）",
                "rate": 50,
                "wrong": 1,
                "key": false,
                "cat": "薄弱",
                "qNos": [
                  11
                ]
              },
              {
                "kpKey": "math::球的切、接问题",
                "kpId": "kp-0013",
                "name": "球的切、接问题",
                "rate": 50,
                "wrong": 1,
                "key": false,
                "cat": "薄弱",
                "qNos": [
                  11
                ]
              },
              {
                "kpKey": "math::棱柱的体积",
                "kpId": "kp-0014",
                "name": "棱柱的体积",
                "rate": 50,
                "wrong": 1,
                "key": false,
                "cat": "薄弱",
                "qNos": [
                  11
                ]
              },
              {
                "kpKey": "math::棱台的体积",
                "kpId": "kp-0015",
                "name": "棱台的体积",
                "rate": 50,
                "wrong": 1,
                "key": false,
                "cat": "薄弱",
                "qNos": [
                  11
                ]
              },
              {
                "kpKey": "math::面面垂直的判定",
                "kpId": "kp-0016",
                "name": "面面垂直的判定",
                "rate": 50,
                "wrong": 1,
                "key": false,
                "cat": "薄弱",
                "qNos": [
                  11
                ]
              },
              {
                "kpKey": "math::抛物线的定义",
                "kpId": "kp-0017",
                "name": "抛物线的定义",
                "rate": 53.3,
                "wrong": 1,
                "key": false,
                "cat": "薄弱",
                "qNos": [
                  17
                ]
              },
              {
                "kpKey": "math::直线与抛物线位置关系及其应用",
                "kpId": "kp-0018",
                "name": "直线与抛物线位置关系及其应用",
                "rate": 53.3,
                "wrong": 1,
                "key": false,
                "cat": "薄弱",
                "qNos": [
                  17
                ]
              },
              {
                "kpKey": "math::抛物线的标准方程",
                "kpId": "kp-0019",
                "name": "抛物线的标准方程",
                "rate": 53.3,
                "wrong": 1,
                "key": false,
                "cat": "薄弱",
                "qNos": [
                  17
                ]
              },
              {
                "kpKey": "math::利用导数研究恒成或极值点求参",
                "kpId": "kp-0020",
                "name": "利用导数研究恒成或极值点求参",
                "rate": 60,
                "wrong": 1,
                "key": false,
                "cat": "考查",
                "qNos": []
              },
              {
                "kpKey": "math::利用导数求已知函数的极值或极值点(含参)",
                "kpId": "kp-0021",
                "name": "利用导数求已知函数的极值或极值点（含参）",
                "rate": 60,
                "wrong": 1,
                "key": false,
                "cat": "待提升",
                "qNos": [
                  16
                ]
              },
              {
                "kpKey": "math::百分位数",
                "kpId": "kp-0022",
                "name": "百分位数",
                "rate": 66.7,
                "wrong": 1,
                "key": false,
                "cat": "待提升",
                "qNos": [
                  10
                ]
              },
              {
                "kpKey": "math::回归直线方程",
                "kpId": "kp-0023",
                "name": "回归直线方程",
                "rate": 66.7,
                "wrong": 1,
                "key": false,
                "cat": "待提升",
                "qNos": [
                  10
                ]
              },
              {
                "kpKey": "math::变量的相关关系",
                "kpId": "kp-0024",
                "name": "变量的相关关系",
                "rate": 66.7,
                "wrong": 1,
                "key": false,
                "cat": "待提升",
                "qNos": [
                  10
                ]
              },
              {
                "kpKey": "math::利用余弦定理解三角形",
                "kpId": "kp-0025",
                "name": "利用余弦定理解三角形",
                "rate": 76.9,
                "wrong": 1,
                "key": false,
                "cat": "待提升",
                "qNos": [
                  15
                ]
              },
              {
                "kpKey": "math::三角形面积公式",
                "kpId": "kp-0026",
                "name": "三角形面积公式",
                "rate": 76.9,
                "wrong": 1,
                "key": false,
                "cat": "待提升",
                "qNos": [
                  15
                ]
              },
              {
                "kpKey": "math::正弦定理及变形",
                "kpId": "kp-0027",
                "name": "正弦定理及变形",
                "rate": 76.9,
                "wrong": 1,
                "key": false,
                "cat": "待提升",
                "qNos": [
                  15
                ]
              },
              {
                "kpKey": "math::利用幂函数的图象与性质比较大小",
                "kpId": "kp-0028",
                "name": "利用幂函数的图象与性质比较大小",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  4
                ]
              },
              {
                "kpKey": "math::余弦(型)函数的周期性",
                "kpId": "kp-0029",
                "name": "余弦（型）函数的周期性",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  9
                ]
              },
              {
                "kpKey": "math::充要条件及其判断",
                "kpId": "kp-0030",
                "name": "充要条件及其判断",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  4
                ]
              },
              {
                "kpKey": "math::求双曲线的离心率(或取值范围)",
                "kpId": "kp-0031",
                "name": "求双曲线的离心率（或取值范围）",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  7
                ]
              },
              {
                "kpKey": "math::交集运算",
                "kpId": "kp-0032",
                "name": "交集运算",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  2
                ]
              },
              {
                "kpKey": "math::指定项的系数与二项式系数",
                "kpId": "kp-0033",
                "name": "指定项的系数与二项式系数",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  3
                ]
              },
              {
                "kpKey": "math::向量的加减与数乘意义",
                "kpId": "kp-0034",
                "name": "向量的加减与数乘意义",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "考查",
                "qNos": []
              },
              {
                "kpKey": "math::利用指数函数的图象与性质比较大小",
                "kpId": "kp-0035",
                "name": "利用指数函数的图象与性质比较大小",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  4
                ]
              },
              {
                "kpKey": "math::求余弦(型)函数的对称轴、对称中心",
                "kpId": "kp-0036",
                "name": "求余弦（型）函数的对称轴、对称中心",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  9
                ]
              },
              {
                "kpKey": "math::平面向量基本定理的应用",
                "kpId": "kp-0037",
                "name": "平面向量基本定理的应用",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  5
                ]
              },
              {
                "kpKey": "math::余弦型函数的奇偶性",
                "kpId": "kp-0038",
                "name": "余弦型函数的奇偶性",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  9
                ]
              },
              {
                "kpKey": "math::解不含参的一元二次不等式",
                "kpId": "kp-0039",
                "name": "解不含参的一元二次不等式",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  2
                ]
              },
              {
                "kpKey": "math::复数的除法运算",
                "kpId": "kp-0040",
                "name": "复数的除法运算",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  1
                ]
              },
              {
                "kpKey": "math::空间中直线与平面的位置关系",
                "kpId": "kp-0041",
                "name": "空间中直线与平面的位置关系",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  6
                ]
              },
              {
                "kpKey": "math::空间中直线与直线的位置关系",
                "kpId": "kp-0042",
                "name": "空间中直线与直线的位置关系",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  6
                ]
              },
              {
                "kpKey": "math::求曲线上一点的切线方程(斜率、倾斜角)",
                "kpId": "kp-0043",
                "name": "求曲线上一点的切线方程（斜率、倾斜角）",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  12
                ]
              },
              {
                "kpKey": "math::向量的加减与数乘混合运算",
                "kpId": "kp-0044",
                "name": "向量的加减与数乘混合运算",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  5
                ]
              },
              {
                "kpKey": "math::复数的模及其几何意义",
                "kpId": "kp-0045",
                "name": "复数的模及其几何意义",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  1
                ]
              },
              {
                "kpKey": "math::余弦型函数的奇偶的应用",
                "kpId": "kp-0046",
                "name": "余弦型函数的奇偶的应用",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": []
              },
              {
                "kpKey": "math::利用导数研究恒成立与存在性问题",
                "kpId": "kp-0047",
                "name": "利用导数研究恒成立与存在性问题",
                "rate": 60,
                "wrong": 1,
                "key": false,
                "cat": "待提升",
                "qNos": [
                  16
                ]
              },
              {
                "kpKey": "math::利用导数根据极值立与存在性问题",
                "kpId": "kp-0048",
                "name": "利用导数根据极值立与存在性问题",
                "rate": 60,
                "wrong": 1,
                "key": false,
                "cat": "待提升",
                "qNos": []
              },
              {
                "kpKey": "math::利用导数根据极值或极值点求参",
                "kpId": "kp-0049",
                "name": "利用导数根据极值或极值点求参",
                "rate": 60,
                "wrong": 1,
                "key": false,
                "cat": "待提升",
                "qNos": [
                  16
                ]
              },
              {
                "kpKey": "math::平面与平面所成角最值问题",
                "kpId": "kp-0050",
                "name": "【重点】平面与平面所成角最值问题",
                "rate": 0,
                "wrong": 1,
                "key": true,
                "cat": "薄弱",
                "qNos": []
              }
            ],
            "wrongQuestions": [
              {
                "no": 8,
                "type": "单选题",
                "point": 5,
                "score": 0,
                "diff": "中",
                "cause": "C6",
                "causeNote": "我的答案 B 与解析推导一致但与参考答案键 D 矛盾，疑答案键或转写有误",
                "kpKeys": [
                  "math::函数的对称性",
                  "math::利用函数的单调性解不等式"
                ],
                "analysisRef": "md/数学-试卷解析 (8).md"
              },
              {
                "no": 10,
                "type": "多选题",
                "point": 6,
                "score": 4,
                "diff": "中",
                "cause": "C1",
                "causeNote": "百分位数位置计算概念不清（5×25%=1.25 → 取第 2 个数据 2.2）",
                "kpKeys": [
                  "math::百分位数",
                  "math::回归直线方程",
                  "math::变量的相关关系"
                ],
                "analysisRef": "md/数学-试卷解析 (10).md"
              },
              {
                "no": 11,
                "type": "多选题",
                "point": 6,
                "score": 3,
                "diff": "中",
                "cause": "C2",
                "causeNote": "面面垂直判定的证明方法链未掌握（OM⊥ON → 线面垂直）",
                "kpKeys": [
                  "math::空间几何体的截面问题(截面形状、面积)",
                  "math::球的切、接问题",
                  "math::棱柱的体积",
                  "math::棱台的体积",
                  "math::面面垂直的判定"
                ],
                "analysisRef": "md/数学-试卷解析 (11).md"
              },
              {
                "no": 13,
                "type": "主观题",
                "point": 5,
                "score": 0,
                "diff": "中",
                "cause": "C2",
                "causeNote": "等差数列最值的 d 范围不等式法未建立（KP 掌握率 0%）；作答区内容与题意不",
                "kpKeys": [
                  "math::圆与圆的位置关系",
                  "math::求圆的标准方程",
                  "math::辅助角公式(三角函数的叠加及应用(北师))"
                ],
                "analysisRef": "md/数学-试卷解析 (13).md"
              },
              {
                "no": 14,
                "type": "主观题",
                "point": 5,
                "score": 0,
                "diff": "难",
                "cause": "C2",
                "causeNote": "圆与圆内切+存在性问题的强技巧方法链未建立，作答空白",
                "kpKeys": [
                  "math::等差数列前n项和的最值问题"
                ],
                "analysisRef": "md/数学-试卷解析 (14).md"
              },
              {
                "no": 15,
                "type": "主观题",
                "point": 13,
                "score": 10,
                "diff": "易",
                "cause": "C5",
                "causeNote": "过程性失分（10/13）；作答影像与本题（解三角形）不符疑转写配图错位，失分步骤",
                "kpKeys": [
                  "math::利用余弦定理解三角形",
                  "math::三角形面积公式",
                  "math::正弦定理及变形"
                ],
                "analysisRef": "md/数学-试卷解析 (15).md"
              },
              {
                "no": 16,
                "type": "主观题",
                "point": 15,
                "score": 9,
                "diff": "中",
                "cause": "C5",
                "causeNote": "过程性失分（9/15）；作答影像与本题（导数极值恒成立）不符疑配图错位",
                "kpKeys": [
                  "math::利用导数求已知函数的极值或极值点(含参)",
                  "math::利用导数研究恒成立与存在性问题",
                  "math::利用导数根据极值或极值点求参"
                ],
                "analysisRef": "md/数学-试卷解析 (16).md"
              },
              {
                "no": 17,
                "type": "主观题",
                "point": 15,
                "score": 8,
                "diff": "中",
                "cause": "C5",
                "causeNote": "过程性失分（8/15）；作答影像与本题（抛物线）不符疑配图错位",
                "kpKeys": [
                  "math::抛物线的定义",
                  "math::直线与抛物线位置关系及其应用",
                  "math::抛物线的标准方程"
                ],
                "analysisRef": "md/数学-试卷解析 (17).md"
              },
              {
                "no": 18,
                "type": "主观题",
                "point": 17,
                "score": 0,
                "diff": "中",
                "cause": "C2",
                "causeNote": "圆锥侧面展开求最短路径+空间向量法方法链未掌握（0 分）",
                "kpKeys": [
                  "math::平面与平面所成角的向量求法",
                  "math::空间向量的数量积与空间向量的垂直关系"
                ],
                "analysisRef": "md/数学-试卷解析 (18).md"
              },
              {
                "no": 19,
                "type": "主观题",
                "point": 17,
                "score": 0,
                "diff": "难",
                "cause": "C2",
                "causeNote": "期望递推与无穷级数求和方法未掌握（0 分）",
                "kpKeys": [
                  "math::离散型随机变量的均值(期望)"
                ],
                "analysisRef": "md/数学-试卷解析 (19).md"
              }
            ]
          },
          "english": {
            "name": "英语",
            "score": 64.5,
            "full": 130,
            "hasCause": false,
            "causeCoverage": {
              "confirmed": 0,
              "total": 36
            },
            "causes": null,
            "kps": [],
            "wrongQuestions": [
              {
                "no": 2,
                "type": "单选题",
                "point": 2.5,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 3,
                "type": "单选题",
                "point": 2.5,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 6,
                "type": "单选题",
                "point": 2.5,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 10,
                "type": "单选题",
                "point": 2.5,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 13,
                "type": "单选题",
                "point": 2.5,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 14,
                "type": "单选题",
                "point": 2.5,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 15,
                "type": "单选题",
                "point": 2.5,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 16,
                "type": "单选题",
                "point": 2.5,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 18,
                "type": "单选题",
                "point": 2.5,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 19,
                "type": "单选题",
                "point": 2.5,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 20,
                "type": "单选题",
                "point": 2.5,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 21,
                "type": "单选题",
                "point": 1,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 24,
                "type": "单选题",
                "point": 1,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 29,
                "type": "单选题",
                "point": 1,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 32,
                "type": "单选题",
                "point": 1,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 38,
                "type": "主观题",
                "point": 1.5,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 39,
                "type": "主观题",
                "point": 1.5,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 40,
                "type": "主观题",
                "point": 1.5,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 41,
                "type": "主观题",
                "point": 1.5,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 43,
                "type": "主观题",
                "point": 1.5,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 45,
                "type": "主观题",
                "point": 1.5,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 47,
                "type": "主观题",
                "point": 1,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 50,
                "type": "主观题",
                "point": 1,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 52,
                "type": "主观题",
                "point": 1,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 54,
                "type": "主观题",
                "point": 1,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 56,
                "type": "主观题",
                "point": 1,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 57,
                "type": "主观题",
                "point": 1,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 58,
                "type": "主观题",
                "point": 1,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 59,
                "type": "主观题",
                "point": 1,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 61,
                "type": "主观题",
                "point": 1,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 62,
                "type": "主观题",
                "point": 1,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 63,
                "type": "主观题",
                "point": 1,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 65,
                "type": "主观题",
                "point": 1,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 71,
                "type": "主观题",
                "point": 1,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 73,
                "type": "主观题",
                "point": 1,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 76,
                "type": "英语作文题",
                "point": 20,
                "score": 9,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              }
            ]
          },
          "physics": {
            "name": "物理",
            "score": 66,
            "full": 100,
            "hasCause": false,
            "causeCoverage": {
              "confirmed": 0,
              "total": 7
            },
            "causes": null,
            "kps": [],
            "wrongQuestions": [
              {
                "no": 3,
                "type": "单选题",
                "point": 4,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 5,
                "type": "单选题",
                "point": 4,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 7,
                "type": "单选题",
                "point": 4,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 12,
                "type": "多选题",
                "point": 5,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 14,
                "type": "主观题",
                "point": 10,
                "score": 8,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 15,
                "type": "主观题",
                "point": 9,
                "score": 8,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 17,
                "type": "主观题",
                "point": 14,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              }
            ]
          },
          "chemistry": {
            "name": "化学",
            "score": 46,
            "full": 100,
            "hasCause": false,
            "causeCoverage": {
              "confirmed": 0,
              "total": 8
            },
            "causes": null,
            "kps": [],
            "wrongQuestions": [
              {
                "no": 5,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 6,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 13,
                "type": "单选题",
                "point": 4,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 17,
                "type": "单选题",
                "point": 4,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 18,
                "type": "单选题",
                "point": 4,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 19,
                "type": "主观题",
                "point": 17,
                "score": 5,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 20,
                "type": "主观题",
                "point": 18,
                "score": 5,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 21,
                "type": "主观题",
                "point": 13,
                "score": 4,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              }
            ]
          },
          "biology": {
            "name": "生物",
            "score": 64,
            "full": 100,
            "hasCause": true,
            "causeCoverage": {
              "confirmed": 12,
              "total": 12
            },
            "causes": {
              "C1": 20,
              "C2": 0,
              "C3": 0,
              "C4": 0,
              "C5": 16,
              "C6": 0
            },
            "kps": [
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>生物大分子以碳链为骨架",
                "kpId": "kp-0052",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>生物大分子以碳链为骨架",
                "rate": 0,
                "wrong": 1,
                "key": false,
                "cat": "薄弱",
                "qNos": [
                  31
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>蛋白质的结构",
                "kpId": "kp-0053",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>蛋白质的结构",
                "rate": 40,
                "wrong": 3,
                "key": false,
                "cat": "薄弱",
                "qNos": [
                  22,
                  23,
                  26,
                  27,
                  34
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>核酸的结构及功能",
                "kpId": "kp-0054",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>核酸的结构及功能",
                "rate": 42.3,
                "wrong": 4,
                "key": true,
                "cat": "薄弱",
                "qNos": [
                  28,
                  29,
                  33,
                  35,
                  37
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>水的含量、存在形式及作用",
                "kpId": "kp-0055",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>水的含量、存在形式及作用",
                "rate": 50,
                "wrong": 1,
                "key": true,
                "cat": "薄弱",
                "qNos": [
                  9,
                  16
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞结构和功能的多样性>>真核细胞和原核细胞的异同",
                "kpId": "kp-0056",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞结构和功能的多样性>>真核细胞和原核细胞的异同",
                "rate": 65,
                "wrong": 1,
                "key": true,
                "cat": "待提升",
                "qNos": [
                  5,
                  6,
                  7,
                  36
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>【实验】检测生物组织中的糖类、脂肪和蛋白质",
                "kpId": "kp-0057",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>【实验】检测生物组织中的糖类、脂肪和蛋白质",
                "rate": 66.7,
                "wrong": 1,
                "key": false,
                "cat": "待提升",
                "qNos": [
                  10,
                  14,
                  18
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>糖类的种类及作用",
                "kpId": "kp-0058",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>糖类的种类及作用",
                "rate": 66.7,
                "wrong": 1,
                "key": false,
                "cat": "待提升",
                "qNos": [
                  17
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>无机盐的含量及作用",
                "kpId": "kp-0059",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>无机盐的含量及作用",
                "rate": 66.7,
                "wrong": 1,
                "key": false,
                "cat": "待提升",
                "qNos": [
                  12,
                  13,
                  15
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>蛋白质的功能",
                "kpId": "kp-0060",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>蛋白质的功能",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  24
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>【实验】观察DNA、RNA在细胞中的分布实验",
                "kpId": "kp-0061",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>【实验】观察DNA、RNA在细胞中的分布实验",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": []
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>蛋白质的盐析和变性",
                "kpId": "kp-0062",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>蛋白质的盐析和变性",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  25
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>脂质的种类及作用",
                "kpId": "kp-0063",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>脂质的种类及作用",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  19,
                  20,
                  21,
                  32
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞和生物界的统一性>>细胞学说的建立过程",
                "kpId": "kp-0064",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞和生物界的统一性>>细胞学说的建立过程",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  2
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞和生物界的统一性>>生命系统的结构层次",
                "kpId": "kp-0065",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞和生物界的统一性>>生命系统的结构层次",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  3
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>组成细胞的化合物",
                "kpId": "kp-0066",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>组成细胞的化合物",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  11
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>细胞中常见的化学元素",
                "kpId": "kp-0067",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>细胞中常见的化学元素",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  8
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>【实验】使用高倍显微镜观察几种细胞",
                "kpId": "kp-0068",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>【实验】使用高倍显微镜观察几种细胞",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  4
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞结构和功能的多样性>>细胞的多样性",
                "kpId": "kp-0069",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞结构和功能的多样性>>细胞的多样性",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": []
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>核酸的种类及存在部位",
                "kpId": "kp-0070",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>核酸的种类及存在部位",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  30
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞和生物界的统一性>>细胞学说的基本观点及意义",
                "kpId": "kp-0071",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞和生物界的统一性>>细胞学说的基本观点及意义",
                "rate": 100,
                "wrong": 0,
                "key": false,
                "cat": "已掌握",
                "qNos": [
                  1
                ]
              },
              {
                "kpKey": "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>氨基酸的结构及其种类",
                "kpId": "kp-0072",
                "name": "分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>氨基酸的结构及其种类",
                "rate": 43.8,
                "wrong": 1,
                "key": true,
                "cat": "薄弱",
                "qNos": []
              }
            ],
            "wrongQuestions": [
              {
                "no": 9,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": "C1",
                "causeNote": "Mg/Fe 与叶绿素/血红素的对应概念混淆（血红素含 Fe 非 Mg）",
                "kpKeys": [
                  "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>水的含量、存在形式及作用"
                ],
                "analysisRef": "md/生物-试卷解析 (9).md"
              },
              {
                "no": 12,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": "C1",
                "causeNote": "缺 K⁺ 与肌肉抽搐症状对应混淆（抽搐系缺 Ca²⁺）",
                "kpKeys": [
                  "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>无机盐的含量及作用"
                ],
                "analysisRef": "md/生物-试卷解析 (12).md"
              },
              {
                "no": 18,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "易",
                "cause": "C1",
                "causeNote": "斐林试剂仅检测还原糖的概念缺口（不是所有糖类均可反应）",
                "kpKeys": [
                  "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>【实验】检测生物组织中的糖类、脂肪和蛋白质"
                ],
                "analysisRef": "md/生物-试卷解析 (18).md"
              },
              {
                "no": 26,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "易",
                "cause": "C1",
                "causeNote": "氨基酸 R 基可含 S（-CH₂SH）的元素组成概念缺口（漏判 S 元素）",
                "kpKeys": [
                  "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>蛋白质的结构"
                ],
                "analysisRef": "md/生物-试卷解析 (26).md"
              },
              {
                "no": 27,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": "C1",
                "causeNote": "蛋白质多样性原因的概念缺口（氨基酸连接方式相同，均为肽键）",
                "kpKeys": [
                  "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>蛋白质的结构"
                ],
                "analysisRef": "md/生物-试卷解析 (27).md"
              },
              {
                "no": 29,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": "C1",
                "causeNote": "核苷酸类别由五碳糖决定的概念缺口（m=G 时可为核糖或脱氧核糖核苷酸）",
                "kpKeys": [
                  "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>核酸的结构及功能"
                ],
                "analysisRef": "md/生物-试卷解析 (29).md"
              },
              {
                "no": 31,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "难",
                "cause": "C1",
                "causeNote": "脂质不属于生物大分子（非多聚体）的概念缺口",
                "kpKeys": [
                  "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>生物大分子以碳链为骨架"
                ],
                "analysisRef": "md/生物-试卷解析 (31).md"
              },
              {
                "no": 33,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "难",
                "cause": "C1",
                "causeNote": "细胞生物遗传物质 = DNA（4 种脱氧核苷酸）概念混淆（按 DNA+RNA 共",
                "kpKeys": [
                  "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>核酸的结构及功能"
                ],
                "analysisRef": "md/生物-试卷解析 (33).md"
              },
              {
                "no": 34,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "易",
                "cause": "C1",
                "causeNote": "肽键数 = 氨基酸数 − 肽链数 公式应用错误（按减 1 计算）",
                "kpKeys": [
                  "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>蛋白质的结构"
                ],
                "analysisRef": "md/生物-试卷解析 (34).md"
              },
              {
                "no": 35,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": "C1",
                "causeNote": "RNA 彻底水解产物（核糖+含氮碱基+磷酸）概念缺口",
                "kpKeys": [
                  "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>核酸的结构及功能"
                ],
                "analysisRef": "md/生物-试卷解析 (35).md"
              },
              {
                "no": 36,
                "type": "主观题",
                "point": 14,
                "score": 7,
                "diff": "中",
                "cause": "C5",
                "causeNote": "过程性失分（7/14）：(1)漏答 A/核膜拟核表述混淆、(5)细胞生物遗传物质",
                "kpKeys": [
                  "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞结构和功能的多样性>>真核细胞和原核细胞的异同"
                ],
                "analysisRef": "md/生物-试卷解析 (36).md"
              },
              {
                "no": 37,
                "type": "主观题",
                "point": 16,
                "score": 7,
                "diff": "中",
                "cause": "C5",
                "causeNote": "过程性失分（7/16）：(2)储能物质误答纤维素、(3)特有碱基未答尿嘧啶、(4",
                "kpKeys": [
                  "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>核酸的结构及功能"
                ],
                "analysisRef": "md/生物-试卷解析 (37).md"
              }
            ]
          },
          "politics": {
            "name": "政治",
            "score": 59,
            "full": 100,
            "hasCause": false,
            "causeCoverage": {
              "confirmed": 0,
              "total": 15
            },
            "causes": null,
            "kps": [],
            "wrongQuestions": [
              {
                "no": 3,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 4,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 6,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 12,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 14,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 15,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 23,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 30,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 31,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 33,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 34,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 35,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 38,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 41,
                "type": "主观题",
                "point": 10,
                "score": 1,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 42,
                "type": "主观题",
                "point": 10,
                "score": 4,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              }
            ]
          },
          "history": {
            "name": "历史",
            "score": 64,
            "full": 100,
            "hasCause": false,
            "causeCoverage": {
              "confirmed": 0,
              "total": 15
            },
            "causes": null,
            "kps": [],
            "wrongQuestions": [
              {
                "no": 1,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 2,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 7,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 9,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 10,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 19,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "难",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 24,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 26,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 31,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 32,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 34,
                "type": "单选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 37,
                "type": "多选题",
                "point": 2,
                "score": 0,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 40,
                "type": "多选题",
                "point": 2,
                "score": 0,
                "diff": "易",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 41,
                "type": "主观题",
                "point": 10,
                "score": 4,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              },
              {
                "no": 42,
                "type": "主观题",
                "point": 10,
                "score": 6,
                "diff": "中",
                "cause": null,
                "causeNote": null,
                "kpKeys": [],
                "analysisRef": null
              }
            ]
          }
        }
      }
    ],
    "kpTimeline": {
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>【实验】检测生物组织中的糖类、脂肪和蛋白质": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 66.7,
          "cat": "待提升"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>【实验】观察DNA、RNA在细胞中的分布实验": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>无机盐的含量及作用": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 66.7,
          "cat": "待提升"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>核酸的种类及存在部位": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>核酸的结构及功能": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 42.3,
          "cat": "薄弱"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>水的含量、存在形式及作用": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 50,
          "cat": "薄弱"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>生物大分子以碳链为骨架": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 0,
          "cat": "薄弱"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>糖类的种类及作用": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 66.7,
          "cat": "待提升"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>组成细胞的化合物": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>细胞中常见的化学元素": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>脂质的种类及作用": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>氨基酸的结构及其种类": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 43.8,
          "cat": "薄弱"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>蛋白质的功能": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>蛋白质的盐析和变性": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的分子组成>>蛋白质的结构及功能>>蛋白质的结构": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 40,
          "cat": "薄弱"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>【实验】使用高倍显微镜观察几种细胞": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞和生物界的统一性>>生命系统的结构层次": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞和生物界的统一性>>细胞学说的基本观点及意义": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞和生物界的统一性>>细胞学说的建立过程": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞结构和功能的多样性>>真核细胞和原核细胞的异同": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 65,
          "cat": "待提升"
        }
      ],
      "biology::分子与细胞>>细胞是生物体结构和功能的基本单位>>细胞的多样性和统一性>>细胞结构和功能的多样性>>细胞的多样性": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::三角形面积公式": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 76.9,
          "cat": "待提升"
        }
      ],
      "math::二面角": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 0,
          "cat": "薄弱"
        }
      ],
      "math::交集运算": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::余弦(型)函数的周期性": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::余弦型函数的奇偶性": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::余弦型函数的奇偶的应用": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::充要条件及其判断": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::函数的对称性": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 0,
          "cat": "薄弱"
        }
      ],
      "math::利用余弦定理解三角形": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 76.9,
          "cat": "待提升"
        }
      ],
      "math::利用函数的单调性解不等式": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 0,
          "cat": "薄弱"
        }
      ],
      "math::利用导数根据极值或极值点求参": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 60,
          "cat": "待提升"
        }
      ],
      "math::利用导数根据极值立与存在性问题": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 60,
          "cat": "待提升"
        }
      ],
      "math::利用导数求已知函数的极值或极值点(含参)": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 60,
          "cat": "待提升"
        }
      ],
      "math::利用导数研究恒成或极值点求参": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 60,
          "cat": "考查"
        }
      ],
      "math::利用导数研究恒成立与存在性问题": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 60,
          "cat": "待提升"
        }
      ],
      "math::利用幂函数的图象与性质比较大小": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::利用指数函数的图象与性质比较大小": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::变量的相关关系": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 66.7,
          "cat": "待提升"
        }
      ],
      "math::向量的加减与数乘意义": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "考查"
        }
      ],
      "math::向量的加减与数乘混合运算": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::回归直线方程": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 66.7,
          "cat": "待提升"
        }
      ],
      "math::圆与圆的位置关系": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 0,
          "cat": "考查"
        }
      ],
      "math::复数的模及其几何意义": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::复数的除法运算": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::多面体和旋转体表面上的最短距离问题": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 0,
          "cat": "薄弱"
        }
      ],
      "math::平面与平面所成角最值问题": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 0,
          "cat": "薄弱"
        }
      ],
      "math::平面与平面所成角的向量求法": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 0,
          "cat": "考查"
        }
      ],
      "math::平面向量基本定理的应用": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::抛物线的定义": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 53.3,
          "cat": "薄弱"
        }
      ],
      "math::抛物线的标准方程": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 53.3,
          "cat": "薄弱"
        }
      ],
      "math::指定项的系数与二项式系数": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::棱台的体积": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 50,
          "cat": "薄弱"
        }
      ],
      "math::棱柱的体积": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 50,
          "cat": "薄弱"
        }
      ],
      "math::正弦定理及变形": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 76.9,
          "cat": "待提升"
        }
      ],
      "math::求余弦(型)函数的对称轴、对称中心": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::求双曲线的离心率(或取值范围)": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::求圆的标准方程": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 0,
          "cat": "考查"
        }
      ],
      "math::求曲线上一点的切线方程(斜率、倾斜角)": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::球的切、接问题": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 50,
          "cat": "薄弱"
        }
      ],
      "math::百分位数": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 66.7,
          "cat": "待提升"
        }
      ],
      "math::直线与抛物线位置关系及其应用": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 53.3,
          "cat": "薄弱"
        }
      ],
      "math::离散型随机变量的均值(期望)": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 0,
          "cat": "薄弱"
        }
      ],
      "math::空间中直线与平面的位置关系": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::空间中直线与直线的位置关系": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::空间几何体的截面问题(截面形状、面积)": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 50,
          "cat": "薄弱"
        }
      ],
      "math::空间向量的数量积与空间向量的垂直关系": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 0,
          "cat": "考查"
        }
      ],
      "math::等差数列前n项和的最值问题": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 0,
          "cat": "考查"
        }
      ],
      "math::解不含参的一元二次不等式": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 100,
          "cat": "已掌握"
        }
      ],
      "math::辅助角公式(三角函数的叠加及应用(北师))": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 0,
          "cat": "考查"
        }
      ],
      "math::面面垂直的判定": [
        {
          "examId": "ex-2026-10-10",
          "date": "2026-10-10",
          "rate": 50,
          "cat": "薄弱"
        }
      ]
    }
  };
  root.GI_JOINT = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
