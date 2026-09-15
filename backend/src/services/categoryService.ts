import type { CategoryType } from '../domain/category.js';
import * as categoryRepository from '../repositories/categoryRepository.js';

export interface CategoryResponse {
  id: string;
  nome: string;
  tipo: string;
}

export interface CategoryListResponse {
  dados: CategoryResponse[];
}

export async function listActiveCategories(
  organizationId: bigint,
  type?: CategoryType,
): Promise<CategoryListResponse> {
  const categories = await categoryRepository.findActiveCategories(organizationId, type);

  return {
    dados: categories.map((category) => ({
      id: category.id.toString(),
      nome: category.name,
      tipo: category.type,
    })),
  };
}
