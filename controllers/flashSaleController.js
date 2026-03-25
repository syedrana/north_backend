const {
  listFlashSales,
  getFlashSaleById,
  getActiveFlashSale,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
} = require("../services/flashSaleService");

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const listAdminFlashSales = asyncHandler(async (req, res) => {
  const result = await listFlashSales(req.query);

  res.status(200).json({
    success: true,
    ...result,
  });
});

const getAdminFlashSaleById = asyncHandler(async (req, res) => {
  const sale = await getFlashSaleById(req.params.flashSaleId);

  if (!sale) {
    return res.status(404).json({
      success: false,
      message: "Flash sale not found",
    });
  }

  res.status(200).json({
    success: true,
    flashSale: sale,
  });
});

const createAdminFlashSale = asyncHandler(async (req, res) => {
  const sale = await createFlashSale(req.body);

  res.status(201).json({
    success: true,
    flashSale: sale,
  });
});

const updateAdminFlashSale = asyncHandler(async (req, res) => {
  const sale = await updateFlashSale(req.params.flashSaleId, req.body);

  res.status(200).json({
    success: true,
    flashSale: sale,
  });
});

const deleteAdminFlashSale = asyncHandler(async (req, res) => {
  await deleteFlashSale(req.params.flashSaleId);

  res.status(200).json({
    success: true,
    message: "Flash sale deleted successfully",
  });
});

const getPublicActiveFlashSale = asyncHandler(async (req, res) => {
  const sale = await getActiveFlashSale();

  res.status(200).json({
    success: true,
    flashSale: sale,
  });
});

module.exports = {
  listAdminFlashSales,
  getAdminFlashSaleById,
  createAdminFlashSale,
  updateAdminFlashSale,
  deleteAdminFlashSale,
  getPublicActiveFlashSale,
};
