# GAP-600/602 计量器具多租户隔离设计

## 背景

`MeasuringEquipmentController` 已经使用 `JwtAuthGuard`，但服务层仍把 `company_id` 写死为 `'1'`，并且查询逾期计量器具时没有按公司过滤。这会导致 SaaS 多公司场景下计量器具、校准记录和逾期预警跨租户混用。

## 目标

把计量器具模块的公司归属统一改为来自 JWT 的 `req.user.companyId`：

- 新增计量器具写入当前公司 `company_id`
- 查询计量器具只返回当前公司未报废数据
- 查询逾期计量器具只返回当前公司数据
- 新增校准记录写入当前公司 `company_id`
- 查询某设备校准记录时校验设备属于当前公司

## 决策

- 不新增 schema 字段。`MeasuringEquipment.company_id` 与 `CalibrationRecord.company_id` 已存在。
- 不改认证模型。复用 `AuthenticatedRequest` 中的 `req.user.companyId`。
- 不做历史数据迁移。现有单租户数据保持不变；历史归属修复应单独由数据迁移脚本处理。
- 服务方法显式接收 `companyId`，控制器负责从请求上下文传入。
- 校准记录查询需要先确认设备属于当前公司，避免通过 equipmentId 枚举跨租户记录。

## 验收

- `POST /measuring-equipment` 创建记录时 `company_id` 等于 JWT companyId。
- `GET /measuring-equipment` 只返回当前公司记录。
- `GET /measuring-equipment/overdue` 只返回当前公司逾期记录。
- `POST /measuring-equipment/calibrations` 创建校准记录时 `company_id` 等于 JWT companyId，并且只能校准当前公司设备。
- `GET /measuring-equipment/:id/calibrations` 不能读取其他公司的设备校准记录。

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** GAP-600 是 P0 且影响多租户事实源，已按 `brainstorming -> grill-me -> writing-plans` 生成本 spec。
- **grill-me 校准结论：** 已质询是否需要 schema 迁移、是否能只修 `findOverdue()`、是否会影响历史单租户数据。结论是 GAP-600 与 GAP-602 必须合并处理；只修 overdue 会留下 create/findAll/calibration 的跨租户风险。
- **执行边界：** 后续 implementation plan 只改 measuring-equipment 控制器、服务和聚焦测试；不改设备台账模块、不改 auth payload、不做历史数据迁移。
