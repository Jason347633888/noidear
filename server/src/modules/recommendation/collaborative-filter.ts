/**
 * 协同过滤算法实现（User-Based CF）
 * 基于余弦相似度计算用户相似性，推荐相关文档
 */

export interface UserDocMatrix {
  [userId: string]: { [documentId: string]: number };
}

/**
 * 计算两个向量的余弦相似度
 */
export function cosineSimilarity(
  vec1: Record<string, number>,
  vec2: Record<string, number>,
): number {
  const keys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (const key of keys) {
    const v1 = vec1[key] || 0;
    const v2 = vec2[key] || 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }

  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * 找到与目标用户最相似的 N 个用户
 */
export function findSimilarUsers(
  targetUserId: string,
  matrix: UserDocMatrix,
  topN = 10,
): Array<{ userId: string; similarity: number }> {
  const targetVec = matrix[targetUserId] || {};
  const similarities: Array<{ userId: string; similarity: number }> = [];

  for (const [userId, vec] of Object.entries(matrix)) {
    if (userId === targetUserId) continue;
    const similarity = cosineSimilarity(targetVec, vec);
    if (similarity > 0) {
      similarities.push({ userId, similarity });
    }
  }

  return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
}

/**
 * 基于相似用户生成推荐分数
 */
export function generateRecommendations(
  targetUserId: string,
  similarUsers: Array<{ userId: string; similarity: number }>,
  matrix: UserDocMatrix,
  limit = 20,
): Array<{ documentId: string; score: number }> {
  const targetDocs = new Set(Object.keys(matrix[targetUserId] || {}));
  const scoreMap: Record<string, number> = {};

  for (const { userId, similarity } of similarUsers) {
    const userDocs = matrix[userId] || {};
    for (const [docId, weight] of Object.entries(userDocs)) {
      if (targetDocs.has(docId)) continue; // 跳过已看过的文档
      scoreMap[docId] = (scoreMap[docId] || 0) + similarity * weight;
    }
  }

  const results = Object.entries(scoreMap)
    .map(([documentId, rawScore]) => ({
      documentId,
      score: Math.min(100, Math.round(rawScore * 100)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return results;
}
