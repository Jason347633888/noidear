import {
  cosineSimilarity,
  findSimilarUsers,
  generateRecommendations,
  UserDocMatrix,
} from '../src/modules/recommendation/collaborative-filter';

describe('CollaborativeFilter', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = { a: 1, b: 2, c: 3 };
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = { a: 1, b: 0 };
      const vec2 = { a: 0, b: 1 };
      expect(cosineSimilarity(vec1, vec2)).toBe(0);
    });

    it('should return 0 for empty vectors', () => {
      expect(cosineSimilarity({}, {})).toBe(0);
      expect(cosineSimilarity({ a: 1 }, {})).toBe(0);
    });

    it('should compute correct similarity for partial overlap', () => {
      const vec1 = { a: 1, b: 1 };
      const vec2 = { a: 1, b: 0 };
      const result = cosineSimilarity(vec1, vec2);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });
  });

  describe('findSimilarUsers', () => {
    const matrix: UserDocMatrix = {
      user1: { doc1: 2, doc2: 3 },
      user2: { doc1: 1, doc2: 4 },
      user3: { doc3: 5 },
    };

    it('should find users with common documents', () => {
      const result = findSimilarUsers('user1', matrix);
      expect(result.some((r) => r.userId === 'user2')).toBe(true);
    });

    it('should not include target user', () => {
      const result = findSimilarUsers('user1', matrix);
      expect(result.every((r) => r.userId !== 'user1')).toBe(true);
    });

    it('should not include user3 (no overlap)', () => {
      const result = findSimilarUsers('user1', matrix);
      expect(result.every((r) => r.userId !== 'user3')).toBe(true);
    });

    it('should sort by similarity descending', () => {
      const result = findSimilarUsers('user1', matrix);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].similarity).toBeGreaterThanOrEqual(result[i].similarity);
      }
    });
  });

  describe('generateRecommendations', () => {
    const matrix: UserDocMatrix = {
      user1: { doc1: 2 },
      user2: { doc1: 2, doc2: 5 },
    };
    const similarUsers = [{ userId: 'user2', similarity: 0.9 }];

    it('should recommend docs not yet seen by target user', () => {
      const result = generateRecommendations('user1', similarUsers, matrix);
      expect(result.some((r) => r.documentId === 'doc2')).toBe(true);
    });

    it('should not recommend docs already seen by target user', () => {
      const result = generateRecommendations('user1', similarUsers, matrix);
      expect(result.every((r) => r.documentId !== 'doc1')).toBe(true);
    });

    it('should return scores in range 0-100', () => {
      const result = generateRecommendations('user1', similarUsers, matrix);
      result.forEach((r) => {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
      });
    });

    it('should respect limit parameter', () => {
      const result = generateRecommendations('user1', similarUsers, matrix, 1);
      expect(result.length).toBeLessThanOrEqual(1);
    });
  });
});
