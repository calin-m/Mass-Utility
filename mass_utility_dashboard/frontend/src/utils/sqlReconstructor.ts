// @Arch[Utils]
// @Description: Reconstructs executable MariaDB mutation SQL queries and projected rollback reversion SQL queries from raw AST ledger payloads.

export interface ReconstructedSql {
  mutationSql: string;
  revertSql: string;
}

export function reconstructSql(rawPayloadStr: string, revertPayloadStr: string): ReconstructedSql {
  const dbPrefix = (window as any).PM_CONFIG?.dbPrefix || 'ps_';
  const idShop = (window as any).PM_CONFIG?.idShop || 1;

  let mutationSql = '-- No executed mutations captured or invalid payload.\n';
  let revertSql = '-- No rollback safety snapshots recorded or invalid payload.\n';

  try {
    const rawPayload = rawPayloadStr ? JSON.parse(rawPayloadStr) : null;
    const revertData = revertPayloadStr ? JSON.parse(revertPayloadStr) : null;

    let productIds: (string | number)[] = [];
    if (revertData && Array.isArray(revertData.target_ids) && revertData.target_ids.length > 0) {
      productIds = revertData.target_ids;
    } else if (revertData && revertData.products && typeof revertData.products === 'object') {
      productIds = Object.keys(revertData.products);
    }
    const escapedIds = productIds.join(', ');

    // 1. Reconstruct Executed Mutation SQL Statements
    if (rawPayload && (productIds.length > 0 || !revertPayloadStr)) {
      const mStatements: string[] = [];
      const targetClause = productIds.length > 0 ? `WHERE id_product IN (${escapedIds})` : `WHERE <TARGET_PRODUCTS>`;
      const targetShopClause = productIds.length > 0 ? `WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop}` : `WHERE <TARGET_PRODUCTS> AND id_shop = ${idShop}`;

      Object.keys(rawPayload).forEach((field) => {
        const action = rawPayload[field];
        const type = (action.type || 'SET').toUpperCase();
        const val = action.value;
        const escStr = String(val !== undefined && val !== null ? val : '').replace(/'/g, "\\'");
        const escFloat = parseFloat(val) || 0;
        const escInt = parseInt(val, 10) || 0;

        switch (field) {
          case 'price':
          case 'product.price': {
            if (type === 'ADD') {
              mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET price = price + ${escFloat} ${targetShopClause};`);
              mStatements.push(`UPDATE \`${dbPrefix}product\` SET price = price + ${escFloat} ${targetClause};`);
            } else if (type === 'MULTIPLY') {
              mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET price = price * ${escFloat} ${targetShopClause};`);
              mStatements.push(`UPDATE \`${dbPrefix}product\` SET price = price * ${escFloat} ${targetClause};`);
            } else {
              mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET price = ${escFloat} ${targetShopClause};`);
              mStatements.push(`UPDATE \`${dbPrefix}product\` SET price = ${escFloat} ${targetClause};`);
            }
            break;
          }
          case 'wholesale_price':
          case 'product.wholesale_price': {
            mStatements.push(`UPDATE \`${dbPrefix}product\` SET wholesale_price = ${escFloat} ${targetClause};`);
            mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET wholesale_price = ${escFloat} ${targetShopClause};`);
            break;
          }
          case 'ecotax':
          case 'product.ecotax': {
            mStatements.push(`UPDATE \`${dbPrefix}product\` SET ecotax = ${escFloat} ${targetClause};`);
            mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET ecotax = ${escFloat} ${targetShopClause};`);
            break;
          }
          case 'active':
          case 'product.active': {
            const activeVal = escInt ? 1 : 0;
            mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET active = ${activeVal} ${targetShopClause};`);
            mStatements.push(`UPDATE \`${dbPrefix}product\` SET active = ${activeVal} ${targetClause};`);
            break;
          }
          case 'on_sale':
          case 'product.on_sale': {
            const saleVal = escInt ? 1 : 0;
            mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET on_sale = ${saleVal} ${targetShopClause};`);
            mStatements.push(`UPDATE \`${dbPrefix}product\` SET on_sale = ${saleVal} ${targetClause};`);
            break;
          }
          case 'discount_percent': {
            const redPct = escFloat / 100.0;
            mStatements.push(`DELETE FROM \`${dbPrefix}specific_price\` ${targetShopClause};`);
            if (redPct > 0 && productIds.length > 0) {
              productIds.forEach((id) => {
                mStatements.push(`INSERT INTO \`${dbPrefix}specific_price\` (\`id_product\`, \`id_shop\`, \`id_currency\`, \`id_country\`, \`id_group\`, \`id_customer\`, \`id_product_attribute\`, \`price\`, \`from_quantity\`, \`reduction\`, \`reduction_tax\`, \`reduction_type\`, \`from\`, \`to\`) VALUES (${id}, ${idShop}, 0, 0, 0, 0, 0, -1.000000, 1, ${redPct}, 1, 'percentage', '0000-00-00 00:00:00', '0000-00-00 00:00:00');`);
              });
            }
            break;
          }
          case 'discount_amount': {
            mStatements.push(`DELETE FROM \`${dbPrefix}specific_price\` ${targetShopClause};`);
            if (escFloat > 0 && productIds.length > 0) {
              productIds.forEach((id) => {
                mStatements.push(`INSERT INTO \`${dbPrefix}specific_price\` (\`id_product\`, \`id_shop\`, \`id_currency\`, \`id_country\`, \`id_group\`, \`id_customer\`, \`id_product_attribute\`, \`price\`, \`from_quantity\`, \`reduction\`, \`reduction_tax\`, \`reduction_type\`, \`from\`, \`to\`) VALUES (${id}, ${idShop}, 0, 0, 0, 0, 0, -1.000000, 1, ${escFloat}, 1, 'amount', '0000-00-00 00:00:00', '0000-00-00 00:00:00');`);
              });
            }
            break;
          }
          case 'quantity':
          case 'stock.quantity': {
            mStatements.push(`UPDATE \`${dbPrefix}stock_available\` SET quantity = ${escInt} ${targetShopClause};`);
            break;
          }
          case 'name':
          case 'product.name': {
            mStatements.push(`UPDATE \`${dbPrefix}product_lang\` SET name = '${escStr}' ${targetShopClause};`);
            break;
          }
          default: {
            mStatements.push(`UPDATE \`${dbPrefix}product\` SET \`${field}\` = '${escStr}' ${targetClause};`);
            break;
          }
        }
      });

      if (mStatements.length > 0) {
        mutationSql = mStatements.join('\n');
      }
    }

    // 2. Reconstruct Rollback Reversion SQL statements from captured baseline values
    if (revertData && revertData.products && typeof revertData.products === 'object' && Object.keys(revertData.products).length > 0) {
      const rStatements: string[] = [];

      Object.keys(revertData.products).forEach((idProduct) => {
        const productBaseline = revertData.products[idProduct];
        if (!productBaseline) return;

        // Case A: Nested baseline state { product: {...}, product_shop: {...} }
        if (productBaseline.product || productBaseline.product_shop) {
          if (productBaseline.product && typeof productBaseline.product === 'object') {
            const updates: string[] = [];
            Object.keys(productBaseline.product).forEach((col) => {
              if (col === 'id_product') return;
              const val = productBaseline.product[col];
              const escVal = val === null ? 'NULL' : `'${String(val).replace(/'/g, "\\'")}'`;
              updates.push(`\`${col}\` = ${escVal}`);
            });
            if (updates.length > 0) {
              rStatements.push(`UPDATE \`${dbPrefix}product\` SET ${updates.join(', ')} WHERE id_product = ${idProduct};`);
            }
          }

          if (productBaseline.product_shop && typeof productBaseline.product_shop === 'object') {
            const updates: string[] = [];
            Object.keys(productBaseline.product_shop).forEach((col) => {
              if (col === 'id_product' || col === 'id_shop') return;
              const val = productBaseline.product_shop[col];
              const escVal = val === null ? 'NULL' : `'${String(val).replace(/'/g, "\\'")}'`;
              updates.push(`\`${col}\` = ${escVal}`);
            });
            if (updates.length > 0) {
              rStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET ${updates.join(', ')} WHERE id_product = ${idProduct} AND id_shop = ${idShop};`);
            }
          }
        } else {
          // Case B: Flat baseline state
          const updates: string[] = [];
          Object.keys(productBaseline).forEach((col) => {
            if (col === 'id_product' || col === 'id_shop') return;
            const val = productBaseline[col];
            const escVal = val === null ? 'NULL' : `'${String(val).replace(/'/g, "\\'")}'`;
            updates.push(`\`${col}\` = ${escVal}`);
          });
          if (updates.length > 0) {
            rStatements.push(`UPDATE \`${dbPrefix}product\` SET ${updates.join(', ')} WHERE id_product = ${idProduct};`);
          }
        }
      });

      // Specific prices rollback
      if (productIds.length > 0) {
        rStatements.push(`DELETE FROM \`${dbPrefix}specific_price\` WHERE id_product IN (${escapedIds}) AND id_shop IN (0, ${idShop});`);
        if (Array.isArray(revertData.specific_prices) && revertData.specific_prices.length > 0) {
          revertData.specific_prices.forEach((sp: any) => {
            const keys: string[] = [];
            const vals: string[] = [];
            Object.keys(sp).forEach((k) => {
              if (k === 'id_specific_price') return;
              keys.push(`\`${k}\``);
              const v = sp[k];
              vals.push(v === null ? 'NULL' : `'${String(v).replace(/'/g, "\\'")}'`);
            });
            if (keys.length > 0) {
              rStatements.push(`INSERT INTO \`${dbPrefix}specific_price\` (${keys.join(', ')}) VALUES (${vals.join(', ')});`);
            }
          });
        }
      }

      if (rStatements.length > 0) {
        revertSql = rStatements.join('\n');
      }
    }
  } catch (e: any) {
    mutationSql = `-- Error compiling executed Mutation SQL: ${e.message}\n`;
    revertSql = `-- Error compiling Rollback Reversion SQL: ${e.message}\n`;
  }

  return { mutationSql, revertSql };
}
