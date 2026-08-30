import { ClearDoseDomainError } from "../udi/ClearDoseDomainError";

function uniqueIds(values) {
  return [...new Set((values ?? []).filter(Boolean).map((value) => String(value)))];
}

function operationError(method) {
  return new ClearDoseDomainError(
    "LOCAL_DRUG_OPERATION_UNAVAILABLE",
    `The local drug operation ${method} is not configured.`,
    { retryable: false, details: { method } },
  );
}

function unknownDrugError(drugId) {
  return new ClearDoseDomainError("UNKNOWN_DRUG", `Unknown seeded UDI drug id: ${drugId}.`, {
    retryable: true,
    recommendedTool: "cleardose_search_drug_index",
    recoveryInput: { query: String(drugId || "") },
    details: { field: "drugId", drugId: String(drugId || "") },
  });
}

function packageError(drug, selector) {
  return new ClearDoseDomainError("PACKAGE_NOT_FOUND", `No seeded package matched ${drug.name}.`, {
    retryable: true,
    recommendedTool: "cleardose_get_drug_index_entry",
    recoveryInput: { drugId: drug.id },
    details: {
      drugId: drug.id,
      variantId: selector.variantId || null,
      strength: selector.strength || null,
      quantity: selector.quantity ?? null,
      availablePackages: (drug.variants ?? []).map((variant) => ({
        id: variant.id,
        form: variant.form,
        strength: variant.strength,
        quantity: variant.quantity,
      })),
    },
  });
}

function resultDrugIds(result) {
  return uniqueIds([
    result?.source?.id,
    result?.drug?.id,
    ...(result?.related ?? []).map((item) => item?.id ?? item?.drugId),
    ...(result?.options ?? []).map((item) => item?.drugId ?? item?.drug?.id),
    ...(result?.eligible ?? []).map((item) => item?.drugId ?? item?.drug?.id),
    ...(result?.discussionOnly ?? []).map((item) => item?.drugId ?? item?.drug?.id),
    ...(result?.selections ?? []).map((item) => item?.drug?.id),
    ...(result?.items ?? []).map((item) => item?.drugId ?? item?.drug?.id),
  ]);
}

export class LocalDrugIndexApi {
  constructor({ dao, operations = null }) {
    if (!dao?.queryDrugs || !dao?.getDrug) throw new TypeError("LocalDrugIndexApi requires a workflow DAO with drug queries.");
    this.dao = dao;
    this.operations = operations;
  }

  configureOperations(operations) {
    this.operations = operations;
    return this;
  }

  async search(input = {}) { return this.dao.queryDrugs(input); }
  async get(id) { return this.dao.getDrug(id); }

  operation(method) {
    const execute = this.operations?.[method];
    if (typeof execute !== "function") throw operationError(method);
    return execute.bind(this.operations);
  }

  async requireDrug(drugId, selector = {}) {
    const drug = await this.get(drugId);
    if (!drug) throw unknownDrugError(drugId);
    const hasSelector = selector.variantId || selector.strength || selector.quantity != null;
    if (!hasSelector) return drug;
    const match = (drug.variants ?? []).find((variant) => (
      (!selector.variantId || variant.id === selector.variantId)
      && (!selector.strength || variant.strength === selector.strength)
      && (selector.quantity == null || Number(variant.quantity) === Number(selector.quantity))
    ));
    if (!match) throw packageError(drug, selector);
    return drug;
  }

  async requireDrugs(drugIds) {
    return Promise.all(uniqueIds(drugIds).map((drugId) => this.requireDrug(drugId)));
  }

  async verifyResult(result) {
    await this.requireDrugs(resultDrugIds(result));
    return result;
  }

  async compareDrugPrices(input = {}) {
    await this.requireDrugs(input.drugIds);
    return this.verifyResult(await this.operation("compareDrugPrices")(input));
  }

  async findRelatedDrugs(input = {}) {
    await this.requireDrug(input.drugId);
    return this.verifyResult(await this.operation("findRelatedDrugs")(input));
  }

  async listCompatibleOptions(input = {}) {
    await this.requireDrug(input.drugId);
    return this.verifyResult(await this.operation("listCompatibleOptions")(input));
  }

  async compareMedicationOptions(input = {}) {
    const usingSides = input.leftDrugId || input.rightDrugId;
    const drugIds = usingSides ? [input.leftDrugId, input.rightDrugId] : input.drugIds;
    await Promise.all(uniqueIds(drugIds).map((drugId) => this.requireDrug(drugId, {
      variantId: usingSides
        ? (String(drugId) === String(input.leftDrugId) ? input.leftVariantId : input.rightVariantId)
        : input.variantIds?.[drugId],
    })));
    return this.verifyResult(await this.operation("compareMedicationOptions")(input));
  }

  async getDrugAvailability(input = {}) {
    await this.requireDrug(input.drugId, input);
    return this.verifyResult(await this.operation("getDrugAvailability")(input));
  }

  async compareDrugAvailability(input = {}) {
    await this.requireDrug(input.drugId, { variantId: input.variantId });
    await this.requireDrugs(input.compatibleDrugIds);
    return this.verifyResult(await this.operation("compareDrugAvailability")(input));
  }

  async estimateDelivery(input = {}) {
    await this.requireDrug(input.drugId, { variantId: input.variantId });
    return this.verifyResult(await this.operation("estimateDelivery")(input));
  }

  async reviewInteractionFlags(input = {}) {
    await this.requireDrugs(input.drugIds);
    return this.operation("reviewInteractionFlags")(input);
  }

  async buildProcurementPlan(input = {}) {
    await Promise.all((input.items ?? []).map((item) => this.requireDrug(item.drugId, item)));
    return this.verifyResult(await this.operation("buildProcurementPlan")(input));
  }
}
