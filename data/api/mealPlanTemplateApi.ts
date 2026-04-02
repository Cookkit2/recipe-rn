import { MealPlanTemplateRepository } from "~/data/db/repositories/MealPlanTemplateRepository";
import { MealPlanRepository } from "~/data/db/repositories/MealPlanRepository";
import { log } from "~/utils/logger";

// Lazy initialization of repositories to avoid timing issues
let _mealPlanTemplateRepository: MealPlanTemplateRepository | null = null;
let _mealPlanRepository: MealPlanRepository | null = null;

function getMealPlanTemplateRepository(): MealPlanTemplateRepository {
  if (!_mealPlanTemplateRepository) {
    _mealPlanTemplateRepository = new MealPlanTemplateRepository();
  }
  return _mealPlanTemplateRepository;
}

function getMealPlanRepository(): MealPlanRepository {
  if (!_mealPlanRepository) {
    _mealPlanRepository = new MealPlanRepository();
  }
  return _mealPlanRepository;
}

export interface MealPlanTemplateData {
  id: string;
  name: string;
  description: string;
  mealSlots: MealSlotTemplate[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MealSlotTemplate {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  mealSlot: string; // "breakfast", "lunch", "dinner", "snack"
  recipeId: string;
  servings: number;
}

export interface ApplyTemplateOptions {
  templateId: string;
  startDate: Date;
  overwriteExisting?: boolean;
}

/**
 * Pure API functions for meal plan template operations
 */
export const mealPlanTemplateApi = {
  /**
   * Create a new meal plan template
   */
  async createTemplate(
    name: string,
    description: string | undefined,
    mealSlots: MealSlotTemplate[]
  ): Promise<MealPlanTemplateData | null> {
    try {
      log.info("📋 Creating meal plan template:", name);

      const templateRepo = getMealPlanTemplateRepository();

      // Validate meal slots
      if (!mealSlots || mealSlots.length === 0) {
        log.warn("Cannot create template: no meal slots provided");
        return null;
      }

      // Convert meal slots to JSON string for storage
      const mealSlotsJson = JSON.stringify(mealSlots);

      const template = await templateRepo.createTemplate({
        name,
        description: description ?? "",
        mealSlots: mealSlotsJson,
      });

      log.info("✅ Created meal plan template:", template.id);

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        mealSlots,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };
    } catch (error) {
      log.error("❌ Error creating meal plan template:", error);
      return null;
    }
  },

  /**
   * Get all meal plan templates
   */
  async getAllTemplates(): Promise<MealPlanTemplateData[]> {
    try {
      log.info("🔍 Fetching meal plan templates...");

      const templateRepo = getMealPlanTemplateRepository();
      const templates = await templateRepo.getAllTemplates();

      const templatesWithSlots: MealPlanTemplateData[] = templates.map((template) => {
        let mealSlots: MealSlotTemplate[] = [];
        try {
          mealSlots = JSON.parse(template.mealSlots);
        } catch (error) {
          log.warn(`Failed to parse meal slots for template ${template.id}`);
          mealSlots = [];
        }

        return {
          id: template.id,
          name: template.name,
          description: template.description,
          mealSlots,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        };
      });

      log.info("✅ Fetched meal plan templates:", templatesWithSlots.length);
      return templatesWithSlots;
    } catch (error) {
      log.error("❌ Error fetching meal plan templates:", error);
      return [];
    }
  },

  /**
   * Get a template by ID
   */
  async getTemplateById(templateId: string): Promise<MealPlanTemplateData | null> {
    try {
      const templateRepo = getMealPlanTemplateRepository();
      const template = await templateRepo.findById(templateId);

      if (!template) {
        log.warn(`Template ${templateId} not found`);
        return null;
      }

      let mealSlots: MealSlotTemplate[] = [];
      try {
        mealSlots = JSON.parse(template.mealSlots);
      } catch (error) {
        log.warn(`Failed to parse meal slots for template ${template.id}`);
      }

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        mealSlots,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };
    } catch (error) {
      log.error("❌ Error getting template by ID:", error);
      return null;
    }
  },

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    name: string | undefined,
    description: string | undefined,
    mealSlots: MealSlotTemplate[] | undefined
  ): Promise<MealPlanTemplateData | null> {
    try {
      log.info("📝 Updating meal plan template:", templateId);

      const templateRepo = getMealPlanTemplateRepository();

      const updateData: {
        name?: string;
        description?: string;
        mealSlots?: string;
      } = {};

      if (name !== undefined) {
        updateData.name = name;
      }
      if (description !== undefined) {
        updateData.description = description;
      }
      if (mealSlots !== undefined) {
        updateData.mealSlots = JSON.stringify(mealSlots);
      }

      const template = await templateRepo.updateTemplate(templateId, updateData);

      if (!template) {
        log.warn(`Template ${templateId} not found for update`);
        return null;
      }

      let finalMealSlots: MealSlotTemplate[] = [];
      try {
        finalMealSlots = JSON.parse(template.mealSlots);
      } catch (error) {
        log.warn(`Failed to parse meal slots for template ${template.id}`);
      }

      log.info("✅ Updated meal plan template:", templateId);

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        mealSlots: finalMealSlots,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };
    } catch (error) {
      log.error("❌ Error updating meal plan template:", error);
      return null;
    }
  },

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      log.info("🗑️ Deleting meal plan template:", templateId);

      const templateRepo = getMealPlanTemplateRepository();
      const success = await templateRepo.deleteTemplate(templateId);

      log.info("✅ Deleted meal plan template:", success);
      return success;
    } catch (error) {
      log.error("❌ Error deleting meal plan template:", error);
      return false;
    }
  },

  /**
   * Apply a template to create meal plans for a week starting from startDate
   */
  async applyTemplate({
    templateId,
    startDate,
    overwriteExisting = false,
  }: ApplyTemplateOptions): Promise<boolean> {
    try {
      log.info("📅 Applying meal plan template:", templateId, "starting from:", startDate);

      // Get the template
      const template = await this.getTemplateById(templateId);
      if (!template) {
        log.warn(`Template ${templateId} not found`);
        return false;
      }

      const mealPlanRepo = getMealPlanRepository();
      const createdMealPlans: string[] = [];

      // Pre-fetch all existing meal plans for the week to avoid N+1 queries
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const existingPlans = await mealPlanRepo.getByDateRange(startDate, endDate);
      const existingPlanMap = new Map();
      for (const plan of existingPlans) {
        // Normalize time to noon to match slotDate calculation below
        const planDate = new Date(plan.date);
        planDate.setHours(12, 0, 0, 0);
        existingPlanMap.set(`${planDate.getTime()}_${plan.mealSlot}`, plan);
      }

      // Apply each meal slot in the template
      for (const slot of template.mealSlots) {
        try {
          // Calculate the actual date for this slot
          const slotDate = new Date(startDate);
          const daysToAdd = (slot.dayOfWeek - slotDate.getDay() + 7) % 7;
          slotDate.setDate(slotDate.getDate() + daysToAdd);

          // Set time to noon to avoid timezone issues
          slotDate.setHours(12, 0, 0, 0);

          // Check if a meal plan already exists for this date and slot in O(1) time
          const existing = existingPlanMap.get(`${slotDate.getTime()}_${slot.mealSlot}`);

          if (existing) {
            if (overwriteExisting) {
              // Update the existing meal plan
              await mealPlanRepo.updateServings(existing.recipeId, slot.servings);
              log.info(
                `Updated existing meal plan for ${slotDate.toISOString()} - ${slot.mealSlot}`
              );
            } else {
              log.info(
                `Skipped existing meal plan for ${slotDate.toISOString()} - ${slot.mealSlot}`
              );
              continue;
            }
          } else {
            // Create a new meal plan
            const mealPlan = await mealPlanRepo.addToPlan({
              recipeId: slot.recipeId,
              servings: slot.servings,
              date: slotDate,
              mealSlot: slot.mealSlot,
            });
            createdMealPlans.push(mealPlan.id);
            log.info(`Created meal plan for ${slotDate.toISOString()} - ${slot.mealSlot}`);
          }
        } catch (error) {
          log.error(`Error applying meal slot ${slot.mealSlot}:`, error);
          // Continue with other slots
        }
      }

      log.info(`✅ Applied template: created ${createdMealPlans.length} meal plans`);
      return true;
    } catch (error) {
      log.error("❌ Error applying meal plan template:", error);
      return false;
    }
  },

  /**
   * Save current week's meal plans as a template
   */
  async saveWeekAsTemplate(
    startDate: Date,
    name: string,
    description: string | undefined
  ): Promise<MealPlanTemplateData | null> {
    try {
      log.info("💾 Saving week as template:", name, "starting from:", startDate);

      const mealPlanRepo = getMealPlanRepository();

      // Get the meal plans for the week
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      const mealPlans = await mealPlanRepo.getByDateRange(startDate, endDate);

      if (mealPlans.length === 0) {
        log.warn("No meal plans found for the week");
        return null;
      }

      // Convert meal plans to template slots
      const mealSlots: MealSlotTemplate[] = mealPlans.map((plan) => ({
        dayOfWeek: plan.date.getDay(),
        mealSlot: plan.mealSlot,
        recipeId: plan.recipeId,
        servings: plan.servings,
      }));

      // Create the template
      const template = await this.createTemplate(name, description, mealSlots);

      log.info("✅ Saved week as template:", template?.id);
      return template;
    } catch (error) {
      log.error("❌ Error saving week as template:", error);
      return null;
    }
  },

  /**
   * Search templates by name or description
   */
  async searchTemplates(searchTerm: string): Promise<MealPlanTemplateData[]> {
    try {
      const templateRepo = getMealPlanTemplateRepository();
      const templates = await templateRepo.searchTemplates(searchTerm);

      return templates.map((template) => {
        let mealSlots: MealSlotTemplate[] = [];
        try {
          mealSlots = JSON.parse(template.mealSlots);
        } catch (error) {
          log.warn(`Failed to parse meal slots for template ${template.id}`);
        }

        return {
          id: template.id,
          name: template.name,
          description: template.description,
          mealSlots,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        };
      });
    } catch (error) {
      log.error("❌ Error searching templates:", error);
      return [];
    }
  },
};
