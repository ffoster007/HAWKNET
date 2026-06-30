package scanner

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"math/rand"
	"net"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// CommonPorts is a curated set of ports most relevant to web/API targets.
var CommonPorts = []int{
	// Well-known service ports (1-1023)
	1, 3, 4, 6, 7, 9, 13, 17, 19, 20, 21, 22, 23, 24, 25, 26, 30, 32, 33, 37,
	42, 43, 49, 53, 70, 79, 80, 81, 82, 83, 84, 85, 88, 89, 90, 99, 100,
	106, 109, 110, 111, 113, 119, 125, 135, 139, 143, 144, 146, 161, 163,
	179, 199, 211, 212, 222, 254, 255, 256, 259, 264, 280, 301, 306, 311,
	340, 366, 389, 406, 407, 416, 417, 425, 427, 443, 444, 445, 458, 464,
	465, 481, 497, 500, 512, 513, 514, 515, 524, 541, 543, 544, 545, 548,
	554, 555, 563, 587, 593, 616, 617, 625, 631, 636, 646, 648, 666, 667,
	668, 683, 687, 691, 700, 705, 711, 714, 720, 722, 726, 749, 765, 777,
	783, 787, 800, 801, 808, 843, 873, 880, 888, 898, 900, 901, 902, 903,
	911, 912, 981, 987, 990, 992, 993, 995, 999, 1000, 1001, 1002, 1007,
	1009, 1010, 1011, 1021, 1022, 1023, 1024, 1025, 1026, 1027, 1028, 1029,
	1030, 1031, 1032, 1033, 1034, 1035, 1036, 1037, 1038, 1039, 1040, 1041,
	1042, 1043, 1044, 1045, 1046, 1047, 1048, 1049, 1050, 1051, 1052, 1053,
	1054, 1055, 1056, 1057, 1058, 1059, 1060, 1061, 1062, 1063, 1064, 1065,
	1066, 1067, 1068, 1069, 1070, 1071, 1072, 1073, 1074, 1075, 1076, 1077,
	1078, 1079, 1080, 1081, 1082, 1083, 1084, 1085, 1086, 1087, 1088, 1089,
	1090, 1091, 1092, 1093, 1094, 1095, 1096, 1097, 1098, 1099, 1100, 1102,
	1104, 1105, 1106, 1107, 1108, 1110, 1111, 1112, 1113, 1114, 1117, 1119,
	1121, 1122, 1123, 1124, 1126, 1130, 1131, 1132, 1137, 1138, 1141, 1145,
	1147, 1148, 1149, 1151, 1152, 1154, 1163, 1164, 1165, 1166, 1169, 1174,
	1175, 1183, 1185, 1186, 1187, 1192, 1198, 1199, 1201, 1213, 1216, 1217,
	1218, 1220, 1222, 1223, 1233, 1234, 1236, 1241, 1243, 1244, 1248, 1259,
	1271, 1272, 1277, 1287, 1296, 1300, 1301, 1309, 1310, 1311, 1322, 1328,
	1334, 1344, 1352, 1360, 1365, 1367, 1371, 1372, 1373, 1374, 1380, 1387,
	1388, 1392, 1394, 1395, 1400, 1404, 1408, 1412, 1414, 1415, 1417, 1418,
	1419, 1424, 1425, 1431, 1433, 1434, 1443, 1455, 1461, 1462, 1463, 1465,
	1466, 1469, 1471, 1479, 1481, 1494, 1500, 1501, 1503, 1521, 1524, 1527,
	1533, 1556, 1560, 1566, 1573, 1580, 1581, 1583, 1589, 1590, 1591, 1600,
	1601, 1611, 1619, 1620, 1622, 1625, 1628, 1630, 1632, 1635, 1637, 1638,
	1641, 1645, 1646, 1658, 1666, 1671, 1673, 1675, 1677, 1686, 1687, 1688,
	1692, 1699, 1700, 1701, 1702, 1703, 1716, 1717, 1718, 1719, 1720, 1721,
	1723, 1730, 1731, 1738, 1745, 1749, 1752, 1755, 1761, 1762, 1766, 1769,
	1772, 1776, 1777, 1781, 1782, 1783, 1789, 1792, 1801, 1805, 1812, 1813,
	1819, 1826, 1827, 1830, 1831, 1839, 1840, 1843, 1852, 1862, 1863, 1864,
	1875, 1880, 1882, 1883, 1892, 1893, 1894, 1898, 1900, 1901, 1908, 1911,
	1912, 1913, 1925, 1935, 1942, 1944, 1947, 1950, 1952, 1962, 1970, 1971,
	1972, 1974, 1975, 1976, 1978, 1984, 1985, 1992, 1994, 1998, 1999, 2000,
	2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2013, 2020,
	2021, 2022, 2030, 2034, 2035, 2038, 2040, 2041, 2042, 2043, 2046, 2047,
	2049, 2065, 2067, 2068, 2080, 2082, 2083, 2086, 2087, 2095, 2096, 2100,
	2102, 2103, 2104, 2105, 2106, 2107, 2111, 2119, 2121, 2126, 2135, 2144,
	2159, 2160, 2161, 2170, 2179, 2181, 2190, 2191, 2196, 2200, 2207, 2222,
	2223, 2230, 2233, 2251, 2260, 2271, 2272, 2283, 2285, 2287, 2288, 2296,
	2300, 2301, 2302, 2303, 2309, 2321, 2323, 2330, 2343, 2344, 2365, 2366,
	2370, 2375, 2376, 2377, 2378, 2382, 2383, 2391, 2393, 2394, 2399, 2400,
	2401, 2402, 2403, 2404, 2414, 2420, 2422, 2425, 2427, 2430, 2431, 2440,
	2444, 2450, 2455, 2458, 2459, 2461, 2467, 2468, 2476, 2483, 2484, 2492,
	2500, 2504, 2512, 2517, 2522, 2525, 2532, 2542, 2556, 2560, 2565, 2577,
	2588, 2590, 2593, 2598, 2599, 2600, 2601, 2602, 2604, 2605, 2607, 2608,
	2628, 2634, 2636, 2638, 2643, 2654, 2656, 2658, 2710, 2717, 2718, 2725,
	2733, 2735, 2736, 2737, 2744, 2745, 2758, 2765, 2766, 2770, 2773, 2775,
	2780, 2784, 2800, 2801, 2809, 2811, 2826, 2831, 2850, 2857, 2868, 2869,
	2877, 2878, 2887, 2909, 2910, 2920, 2926, 2939, 2947, 2948, 2949, 2950,
	2951, 2952, 2953, 2954, 2967, 2968, 2998, 3000, 3001, 3002, 3003, 3004,
	3005, 3006, 3007, 3008, 3009, 3010, 3011, 3012, 3013, 3017, 3025, 3030,
	3031, 3040, 3046, 3048, 3050, 3051, 3052, 3061, 3071, 3075, 3077, 3080,
	3086, 3094, 3100, 3101, 3105, 3111, 3118, 3119, 3124, 3127, 3128, 3130,
	3137, 3141, 3142, 3145, 3146, 3148, 3150, 3162, 3165, 3166, 3168, 3171,
	3172, 3180, 3181, 3182, 3198, 3205, 3211, 3221, 3232, 3240, 3245, 3246,
	3250, 3260, 3261, 3268, 3269, 3270, 3279, 3283, 3290, 3292, 3296, 3299,
	3300, 3301, 3304, 3305, 3306, 3310, 3311, 3312, 3322, 3323, 3324, 3325,
	3332, 3333, 3349, 3350, 3351, 3352, 3354, 3360, 3367, 3370, 3371, 3372,
	3377, 3386, 3389, 3390, 3396, 3404, 3411, 3412, 3418, 3421, 3430, 3434,
	3435, 3443, 3455, 3456, 3457, 3460, 3464, 3476, 3478, 3479, 3483, 3493,
	3497, 3503, 3504, 3509, 3512, 3516, 3522, 3527, 3530, 3535, 3537, 3542,
	3544, 3551, 3562, 3568, 3570, 3572, 3582, 3583, 3587, 3591, 3595, 3597,
	3600, 3601, 3606, 3628, 3632, 3640, 3646, 3654, 3659, 3663, 3668, 3671,
	3689, 3690, 3702, 3703, 3724, 3728, 3737, 3747, 3749, 3755, 3760, 3761,
	3766, 3780, 3784, 3790, 3799, 3800, 3801, 3804, 3808, 3809, 3814, 3817,
	3820, 3821, 3825, 3826, 3827, 3828, 3830, 3839, 3845, 3847, 3860, 3863,
	3865, 3868, 3872, 3878, 3880, 3888, 3899, 3900, 3903, 3905, 3914, 3918,
	3920, 3935, 3945, 3960, 3970, 3971, 3988, 3995, 3998, 3999, 4000, 4001,
	4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 4010, 4011, 4012, 4022,
	4023, 4028, 4035, 4040, 4045, 4050, 4067, 4075, 4076, 4080, 4087, 4089,
	4093, 4097, 4100, 4105, 4111, 4114, 4117, 4120, 4122, 4125, 4129, 4132,
	4133, 4144, 4154, 4155, 4161, 4162, 4166, 4173, 4187, 4190, 4199, 4200,
	4201, 4204, 4224, 4242, 4247, 4249, 4250, 4251, 4279, 4282, 4288, 4289,
	4292, 4300, 4310, 4317, 4321, 4322, 4333, 4343, 4344, 4347, 4350, 4353,
	4357, 4369, 4386, 4400, 4442, 4443, 4444, 4445, 4446, 4449, 4460, 4480,
	4500, 4502, 4505, 4506, 4520, 4527, 4535, 4545, 4546, 4550, 4552, 4554,
	4555, 4563, 4566, 4567, 4569, 4588, 4593, 4597, 4600, 4622, 4628, 4637,
	4649, 4658, 4659, 4662, 4664, 4672, 4689, 4691, 4700, 4701, 4702, 4711,
	4725, 4728, 4730, 4738, 4742, 4744, 4750, 4752, 4753, 4762, 4786, 4792,
	4800, 4801, 4802, 4827, 4837, 4839, 4840, 4847, 4848, 4849, 4876, 4880,
	4881, 4882, 4885, 4894, 4899, 4912, 4913, 4914, 4920, 4921, 4936, 4940,
	4949, 4969, 4977, 4987, 4988, 4998, 4999, 5000, 5001, 5002, 5003, 5004,
	5009, 5010, 5011, 5012, 5020, 5022, 5030, 5033, 5035, 5039, 5040, 5042,
	5050, 5051, 5054, 5059, 5060, 5061, 5070, 5080, 5087, 5093, 5099, 5100,
	5101, 5102, 5109, 5110, 5116, 5120, 5135, 5140, 5150, 5151, 5154, 5155,
	5161, 5168, 5180, 5187, 5190, 5200, 5214, 5221, 5222, 5225, 5226, 5231,
	5232, 5236, 5245, 5246, 5247, 5250, 5252, 5269, 5272, 5280, 5281, 5282,
	5298, 5300, 5301, 5312, 5313, 5314, 5318, 5321, 5343, 5344, 5353, 5355,
	5357, 5361, 5364, 5390, 5400, 5402, 5405, 5412, 5413, 5414, 5416, 5418,
	5422, 5432, 5433, 5440, 5443, 5453, 5454, 5455, 5456, 5465, 5471, 5473,
	5488, 5495, 5498, 5500, 5505, 5506, 5517, 5522, 5530, 5540, 5544, 5550,
	5553, 5554, 5555, 5556, 5560, 5566, 5569, 5579, 5583, 5584, 5591, 5598,
	5600, 5601, 5616, 5631, 5633, 5640, 5646, 5656, 5657, 5666, 5671, 5672,
	5673, 5675, 5678, 5679, 5680, 5683, 5688, 5700, 5713, 5714, 5718, 5720,
	5722, 5729, 5730, 5739, 5741, 5742, 5745, 5750, 5755, 5757, 5766, 5767,
	5768, 5770, 5777, 5781, 5782, 5783, 5786, 5787, 5798, 5800, 5801, 5802,
	5810, 5811, 5814, 5815, 5822, 5825, 5850, 5859, 5862, 5877, 5880, 5889,
	5900, 5901, 5902, 5903, 5904, 5906, 5907, 5910, 5911, 5915, 5922, 5925,
	5950, 5952, 5959, 5960, 5961, 5962, 5963, 5968, 5977, 5978, 5979, 5984,
	5985, 5986, 5987, 5988, 5989, 5990, 5991, 5992, 5993, 5994, 5995, 5997,
	5999, 6000, 6001, 6002, 6003, 6004, 6005, 6006, 6007, 6009, 6010, 6011,
	6015, 6017, 6025, 6036, 6050, 6051, 6059, 6060, 6064, 6065, 6066, 6067,
	6070, 6071, 6080, 6082, 6084, 6085, 6088, 6095, 6099, 6100, 6101, 6103,
	6106, 6110, 6111, 6112, 6118, 6122, 6123, 6129, 6141, 6142, 6146, 6147,
	6148, 6149, 6153, 6159, 6161, 6170, 6171, 6176, 6181, 6183, 6190, 6192,
	6200, 6203, 6222, 6225, 6232, 6237, 6241, 6242, 6243, 6244, 6253, 6267,
	6268, 6269, 6280, 6292, 6293, 6300, 6301, 6306, 6315, 6316, 6317, 6320,
	6321, 6322, 6331, 6343, 6346, 6347, 6350, 6360, 6363, 6370, 6379, 6382,
	6389, 6390, 6400, 6401, 6404, 6417, 6420, 6429, 6435, 6440, 6444, 6445,
	6446, 6455, 6456, 6463, 6464, 6471, 6480, 6481, 6483, 6485, 6490, 6498,
	6500, 6502, 6503, 6505, 6506, 6508, 6509, 6510, 6511, 6513, 6514, 6515,
	6519, 6520, 6526, 6537, 6539, 6543, 6547, 6549, 6550, 6556, 6558, 6560,
	6565, 6566, 6567, 6571, 6580, 6581, 6582, 6588, 6600, 6601, 6602, 6619,
	6620, 6621, 6622, 6623, 6626, 6628, 6635, 6640, 6641, 6646, 6653, 6655,
	6656, 6657, 6660, 6661, 6662, 6663, 6664, 6665, 6666, 6667, 6668, 6669,
	6670, 6671, 6672, 6673, 6679, 6689, 6692, 6699, 6700, 6701, 6702, 6703,
	6715, 6734, 6745, 6766, 6767, 6779, 6785, 6786, 6788, 6789, 6792, 6800,
	6801, 6817, 6827, 6839, 6850, 6868, 6878, 6881, 6888, 6891, 6901, 6904,
	6910, 6922, 6928, 6937, 6939, 6946, 6951, 6961, 6969, 6970, 6987, 6988,
	6998, 7000, 7001, 7002, 7003, 7004, 7005, 7006, 7007, 7008, 7009, 7010,
	7011, 7012, 7014, 7015, 7020, 7021, 7023, 7025, 7030, 7034, 7040, 7050,
	7051, 7070, 7071, 7073, 7080, 7085, 7088, 7099, 7100, 7101, 7103, 7106,
	7117, 7121, 7123, 7128, 7130, 7132, 7141, 7144, 7145, 7161, 7170, 7171,
	7174, 7181, 7185, 7186, 7200, 7201, 7215, 7220, 7221, 7222, 7226, 7240,
	7244, 7262, 7270, 7272, 7273, 7275, 7279, 7280, 7281, 7282, 7283, 7286,
	7292, 7293, 7297, 7300, 7301, 7304, 7305, 7306, 7307, 7308, 7309, 7312,
	7316, 7317, 7320, 7321, 7323, 7329, 7330, 7331, 7335, 7340, 7341, 7343,
	7348, 7349, 7350, 7352, 7357, 7358, 7359, 7361, 7365, 7367, 7373, 7377,
	7380, 7385, 7386, 7389, 7390, 7391, 7392, 7393, 7394, 7395, 7396, 7397,
	7399, 7400, 7401, 7402, 7405, 7406, 7407, 7410, 7411, 7415, 7420, 7421,
	7426, 7427, 7428, 7429, 7430, 7431, 7435, 7443, 7450, 7465, 7471, 7473,
	7474, 7480, 7481, 7482, 7483, 7492, 7496, 7498, 7500, 7501, 7508, 7509,
	7510, 7512, 7522, 7525, 7534, 7542, 7543, 7547, 7548, 7563, 7566, 7569,
	7570, 7578, 7579, 7580, 7588, 7600, 7603, 7618, 7625, 7627, 7628, 7629,
	7632, 7633, 7634, 7640, 7648, 7654, 7657, 7659, 7673, 7674, 7675, 7676,
	7680, 7684, 7690, 7697, 7700, 7701, 7707, 7708, 7712, 7713, 7716, 7718,
	7720, 7724, 7725, 7726, 7727, 7728, 7734, 7738, 7741, 7743, 7744, 7747,
	7749, 7750, 7754, 7756, 7760, 7761, 7762, 7763, 7766, 7770, 7771, 7774,
	7775, 7776, 7777, 7778, 7779, 7780, 7781, 7782, 7786, 7787, 7789, 7794,
	7797, 7798, 7799, 7800, 7805, 7810, 7826, 7830, 7831, 7845, 7846, 7852,
	7862, 7863, 7867, 7869, 7870, 7872, 7878, 7880, 7883, 7887, 7890, 7891,
	7895, 7898, 7899, 7900, 7901, 7902, 7905, 7910, 7911, 7915, 7920, 7921,
	7922, 7924, 7930, 7932, 7933, 7937, 7938, 7942, 7943, 7950, 7952, 7957,
	7961, 7962, 7967, 7969, 7979, 7980, 7982, 7984, 7991, 7999, 8000, 8001,
	8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009, 8010, 8011, 8012, 8013,
	8014, 8015, 8016, 8019, 8020, 8021, 8022, 8023, 8025, 8026, 8028, 8030,
	8032, 8033, 8034, 8040, 8042, 8044, 8045, 8048, 8050, 8052, 8053, 8054,
	8056, 8058, 8059, 8060, 8064, 8066, 8069, 8070, 8074, 8075, 8080, 8081,
	8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089, 8090, 8091, 8093, 8094,
	8098, 8099, 8100, 8102, 8103, 8105, 8109, 8110, 8111, 8112, 8116, 8118,
	8121, 8122, 8123, 8126, 8128, 8129, 8130, 8132, 8139, 8140, 8143, 8148,
	8149, 8150, 8151, 8153, 8156, 8160, 8161, 8162, 8170, 8171, 8172, 8174,
	8176, 8180, 8181, 8182, 8183, 8184, 8190, 8191, 8192, 8193, 8194, 8199,
	8200, 8204, 8205, 8208, 8211, 8212, 8220, 8221, 8222, 8225, 8230, 8243,
	8253, 8254, 8276, 8280, 8282, 8284, 8290, 8291, 8292, 8294, 8300, 8303,
	8307, 8311, 8313, 8320, 8321, 8322, 8326, 8330, 8331, 8332, 8333, 8334,
	8337, 8342, 8351, 8360, 8376, 8377, 8378, 8379, 8380, 8383, 8384, 8389,
	8390, 8393, 8400, 8402, 8403, 8415, 8416, 8417, 8420, 8421, 8423, 8428,
	8429, 8430, 8431, 8432, 8433, 8434, 8442, 8443, 8444, 8445, 8450, 8457,
	8460, 8466, 8473, 8484, 8500, 8501, 8502, 8512, 8530, 8531, 8540, 8554,
	8555, 8563, 8567, 8570, 8580, 8590, 8600, 8610, 8611, 8612, 8613, 8614,
	8615, 8620, 8622, 8628, 8649, 8651, 8652, 8654, 8660, 8661, 8668, 8673,
	8675, 8686, 8690, 8700, 8701, 8710, 8711, 8732, 8733, 8750, 8763, 8764,
	8765, 8766, 8770, 8780, 8786, 8787, 8788, 8793, 8800, 8804, 8805, 8815,
	8834, 8840, 8843, 8844, 8850, 8860, 8863, 8864, 8872, 8873, 8874, 8880,
	8881, 8882, 8883, 8888, 8889, 8891, 8899, 8900, 8910, 8912, 8913, 8920,
	8937, 8945, 8953, 8954, 8961, 8980, 8983, 8990, 8994, 8997, 8998, 8999,
	9000, 9001, 9002, 9003, 9005, 9006, 9008, 9009, 9010, 9011, 9012, 9013,
	9020, 9021, 9022, 9023, 9024, 9025, 9026, 9030, 9035, 9037, 9040, 9043,
	9050, 9051, 9060, 9064, 9065, 9071, 9080, 9081, 9083, 9084, 9085, 9087,
	9090, 9091, 9092, 9093, 9094, 9095, 9096, 9097, 9098, 9099, 9100, 9101,
	9102, 9103, 9105, 9106, 9107, 9110, 9111, 9112, 9115, 9116, 9118, 9119,
	9120, 9121, 9122, 9123, 9126, 9130, 9131, 9140, 9143, 9150, 9151, 9152,
	9156, 9157, 9160, 9162, 9163, 9164, 9170, 9171, 9173, 9174, 9180, 9182,
	9187, 9191, 9199, 9200, 9201, 9202, 9203, 9204, 9205, 9206, 9207, 9208,
	9209, 9210, 9211, 9212, 9213, 9214, 9215, 9216, 9217, 9220, 9222, 9229,
	9230, 9235, 9236, 9241, 9253, 9255, 9275, 9280, 9281, 9283, 9284, 9287,
	9292, 9295, 9300, 9306, 9309, 9310, 9312, 9318, 9322, 9323, 9325, 9332,
	9333, 9339, 9343, 9344, 9346, 9350, 9367, 9370, 9380, 9387, 9388, 9389,
	9390, 9396, 9397, 9400, 9401, 9402, 9404, 9405, 9408, 9409, 9415, 9418,
	9420, 9421, 9422, 9423, 9425, 9430, 9431, 9432, 9433, 9435, 9440, 9443,
	9444, 9450, 9453, 9460, 9462, 9475, 9485, 9495, 9497, 9500, 9501, 9502,
	9503, 9504, 9505, 9510, 9513, 9518, 9520, 9524, 9525, 9526, 9530, 9532,
	9535, 9536, 9540, 9541, 9545, 9549, 9550, 9555, 9559, 9560, 9561, 9566,
	9573, 9580, 9582, 9583, 9592, 9593, 9594, 9595, 9596, 9600, 9602, 9610,
	9612, 9614, 9617, 9618, 9620, 9621, 9622, 9628, 9629, 9632, 9633, 9650,
	9651, 9652, 9660, 9666, 9667, 9668, 9669, 9675, 9676, 9680, 9684, 9688,
	9692, 9695, 9698, 9701, 9710, 9711, 9715, 9727, 9735, 9741, 9742, 9750,
	9753, 9760, 9762, 9780, 9785, 9786, 9788, 9792, 9800, 9801, 9802, 9810,
	9815, 9816, 9817, 9822, 9823, 9830, 9831, 9842, 9850, 9855, 9866, 9869,
	9876, 9877, 9878, 9880, 9885, 9886, 9888, 9889, 9898, 9899, 9900, 9901,
	9903, 9909, 9911, 9912, 9917, 9925, 9929, 9930, 9943, 9944, 9950, 9951,
	9955, 9960, 9966, 9968, 9975, 9978, 9979, 9980, 9981, 9982, 9987, 9988,
	9990, 9991, 9992, 9993, 9994, 9995, 9996, 9997, 9998, 9999,
}

// PortResult describes the outcome of probing a single port.

// PortScanner performs concurrent TCP connect scans with bounded
// concurrency, context-aware cancellation, and optional retries for
// ports that time out (as opposed to being actively refused).
type PortScanner struct {
	// ConnectTimeout bounds each individual TCP connect attempt.
	ConnectTimeout time.Duration
	// BannerTimeout bounds how long we wait for a banner after connect.
	// Kept separate (and shorter) from ConnectTimeout because most open
	// ports that don't speak first will never send anything, and we
	// don't want banner grabbing to dominate scan time.
	BannerTimeout time.Duration
	// Concurrency is the max number of in-flight connection attempts.
	Concurrency int
	// GrabBanner enables best-effort banner collection on open ports.
	GrabBanner bool

	// MaxRetries is how many additional attempts are made for a port
	// whose connection attempt times out (not for refused connections,
	// which are unambiguous and not worth retrying). 0 disables retries.
	MaxRetries int
	// RetryBackoff is the base delay before a retry; actual delay grows
	// with attempt number and includes jitter to avoid thundering-herd
	// behavior against the same target.
	RetryBackoff time.Duration

	// fdLimited is set after we observe an fd-exhaustion style error, so
	// subsequent probes can back off concurrency instead of repeatedly
	// hammering a resource ceiling the OS has already told us about.
	fdLimited int32
}

// NewPortScanner returns a PortScanner configured with sane defaults for
// scanning a single host across the CommonPorts list.
func NewPortScanner() *PortScanner {
	return &PortScanner{
		ConnectTimeout: 2 * time.Second,
		BannerTimeout:  500 * time.Millisecond,
		Concurrency:    100,
		GrabBanner:     true,
		MaxRetries:     1,
		RetryBackoff:   150 * time.Millisecond,
	}
}

// Scan checks every port in ports against host. Open ports are sent to the
// results channel as they're discovered (not buffered into a slice), so
// callers can start acting on results immediately. Scan blocks until every
// port has been probed (including retries) or ctx is cancelled.
func (ps *PortScanner) Scan(ctx context.Context, host string, ports []int, results chan<- PortResult) {
	concurrency := ps.Concurrency
	if concurrency <= 0 {
		concurrency = 1
	}

	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup

portLoop:
	for _, port := range ports {
		// Acquire a semaphore slot, but stay responsive to cancellation
		// while waiting — don't let a full semaphore delay shutdown.
		select {
		case sem <- struct{}{}:
		case <-ctx.Done():
			break portLoop
		}

		wg.Add(1)
		go func(p int) {
			defer wg.Done()
			defer func() { <-sem }()

			result, ok := ps.probeWithRetry(ctx, host, p)
			if !ok {
				return
			}

			select {
			case results <- result:
			case <-ctx.Done():
			}
		}(port)
	}

	wg.Wait()
}

// probeWithRetry probes a port, retrying a bounded number of times if the
// failure looks transient (timeout) rather than definitive (refused, or
// the host actively closing the connection). Refused connections are not
// retried since retrying them wastes time without changing the outcome.
func (ps *PortScanner) probeWithRetry(ctx context.Context, host string, port int) (PortResult, bool) {
	var lastErr error

	for attempt := 0; attempt <= ps.MaxRetries; attempt++ {
		if ctx.Err() != nil {
			return PortResult{}, false
		}

		result, err := ps.probePort(ctx, host, port)
		if err == nil {
			return result, true
		}
		lastErr = err

		if !isRetryable(err) {
			return PortResult{}, false
		}
		if attempt == ps.MaxRetries {
			break
		}

		if waitErr := ps.backoff(ctx, attempt); waitErr != nil {
			return PortResult{}, false
		}
	}

	_ = lastErr // retained for future structured logging/metrics hookup
	return PortResult{}, false
}

// backoff sleeps for a jittered, exponentially-increasing delay before a
// retry, returning early if ctx is cancelled mid-wait.
func (ps *PortScanner) backoff(ctx context.Context, attempt int) error {
	base := ps.RetryBackoff
	if base <= 0 {
		base = 100 * time.Millisecond
	}

	// Exponential growth capped to avoid runaway delays on many retries.
	delay := base << uint(attempt)
	const maxDelay = 2 * time.Second
	if delay > maxDelay || delay <= 0 {
		delay = maxDelay
	}

	// Add up to 25% jitter so concurrent retries across many goroutines
	// don't all wake up and redial at the same instant.
	jitter := time.Duration(rand.Int63n(int64(delay)/4 + 1))
	delay += jitter

	timer := time.NewTimer(delay)
	defer timer.Stop()

	select {
	case <-timer.C:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// isRetryable reports whether err looks like a transient failure worth
// retrying (timeout, temporary network error) as opposed to a definitive
// signal (connection refused, no route to host) that won't change on
// retry.
func isRetryable(err error) bool {
	if err == nil {
		return false
	}

	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}

	// "connection refused" / "no route to host" etc. are definitive —
	// the port is closed/filtered in a way that won't change. Treat
	// everything else (including transient fd exhaustion) as retryable,
	// since those are exactly the cases retries help with.
	var opErr *net.OpError
	if errors.As(err, &opErr) {
		if opErr.Op == "dial" {
			msg := opErr.Err.Error()
			if strings.Contains(msg, "refused") || strings.Contains(msg, "no route to host") {
				return false
			}
		}
	}

	return true
}

// probePort attempts a single TCP connect to host:port. On success it
// optionally grabs a banner and returns a populated PortResult. On
// failure it returns the underlying error so the caller can decide
// whether a retry is warranted.
func (ps *PortScanner) probePort(ctx context.Context, host string, port int) (PortResult, error) {
	addr := net.JoinHostPort(host, fmt.Sprintf("%d", port))

	connectTimeout := ps.ConnectTimeout
	if connectTimeout <= 0 {
		connectTimeout = 2 * time.Second
	}

	dialer := &net.Dialer{Timeout: connectTimeout}

	start := time.Now()
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		if isFDExhaustion(err) {
			atomic.StoreInt32(&ps.fdLimited, 1)
		}
		return PortResult{}, err
	}
	defer conn.Close()
	rtt := time.Since(start)

	result := PortResult{
		Port:     port,
		Protocol: "tcp",
		State:    "open",
		RTT:      rtt,
	}

	if ps.GrabBanner {
		result.Banner = grabBanner(conn, ps.BannerTimeout)
	}

	return result, nil
}

// isFDExhaustion detects the common "too many open files" failure mode so
// callers can choose to back off concurrency rather than treating it like
// an ordinary connection failure.
func isFDExhaustion(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "too many open files")
}

// FDLimited reports whether this scanner has observed file-descriptor
// exhaustion during scanning. Callers can poll this to decide whether to
// reduce Concurrency for subsequent batches/hosts.
func (ps *PortScanner) FDLimited() bool {
	return atomic.LoadInt32(&ps.fdLimited) == 1
}

// grabBanner attempts to read a single line from conn within timeout.
// Many open ports never send anything unprompted, so this is expected to
// return an empty string in the common case — that's not an error.
func grabBanner(conn net.Conn, timeout time.Duration) string {
	if timeout <= 0 {
		timeout = 500 * time.Millisecond
	}

	_ = conn.SetReadDeadline(time.Now().Add(timeout))
	scanner := bufio.NewScanner(conn)
	scanner.Buffer(make([]byte, 0, 4096), 4096)

	if scanner.Scan() {
		banner := strings.TrimSpace(scanner.Text())
		// Truncate long banners — we only need identification, not full content.
		const maxBannerLen = 256
		if len(banner) > maxBannerLen {
			banner = banner[:maxBannerLen] + "..."
		}
		return banner
	}
	return ""
}
