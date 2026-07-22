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

    let productIds: (string | number)[] = revertData && revertData.target_ids ? revertData.target_ids : [];
    if (productIds.length === 0 && revertData && revertData.products) {
      productIds = Object.keys(revertData.products);
    }
    const escapedIds = productIds.join(', ');

    if (rawPayload && productIds.length > 0) {
      const mStatements: string[] = [];
      Object.keys(rawPayload).forEach((field) => {
        const action = rawPayload[field];
        const type = (action.type || 'SET').toUpperCase();
        const val = action.value;

        switch (field) {
          case 'price':
          case 'product.price': {
            const escFloat = parseFloat(val) || 0;
            if (type === 'ADD') {
              mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET price = price + ${escFloat} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
              mStatements.push(`UPDATE \`${dbPrefix}product\` SET price = price + ${escFloat} WHERE id_product IN (${escapedIds});`);
            } else if (type === 'MULTIPLY') {
              mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET price = price * ${escFloat} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
              mStatements.push(`UPDATE \`${dbPrefix}product\` SET price = price * ${escFloat} WHERE id_product IN (${escapedIds});`);
            } else {
              mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET price = ${escFloat} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
              mStatements.push(`UPDATE \`${dbPrefix}product\` SET price = ${escFloat} WHERE id_product IN (${escapedIds});`);
            }
            break;
          }
          case 'wholesale_price':
          case 'product.wholesale_price': {
            const escFloat = parseFloat(val) || 0;
            mStatements.push(`UPDATE \`${dbPrefix}product\` SET wholesale_price = ${escFloat} WHERE id_product IN (${escapedIds});`);
            mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET wholesale_price = ${escFloat} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
            break;
          }
          case 'active':
          case 'product.active': {
            const escInt = parseInt(val, 10) ? 1 : 0;
            mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET active = ${escInt} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
            mStatements.push(`UPDATE \`${dbPrefix}product\` SET active = ${escInt} WHERE id_product IN (${escapedIds});`);
            break;
          }
          case 'on_sale':
          case 'product.on_sale': {
            const escInt = parseInt(val, 10) ? 1 : 0;
            mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET on_sale = ${escInt} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
            mStatements.push(`UPDATE \`${dbPrefix}product\` SET on_sale = ${escInt} WHERE id_product IN (${escapedIds});`);
            break;
          }
          case 'reference':
          case 'product.reference': {
            const escStr = String(val).replace(/'/g, "\\'");
            mStatements.push(`UPDATE \`${dbPrefix}product\` SET reference = '${escStr}' WHERE id_product IN (${escapedIds});`);
            break;
          }
          case 'id_manufacturer':
          case 'manufacturer.id':
          case 'product.id_manufacturer': {
            const escMan = parseInt(val, 10) || 0;
            mStatements.push(`UPDATE \`${dbPrefix}product\` SET id_manufacturer = ${escMan} WHERE id_product IN (${escapedIds});`);
            mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET id_manufacturer = ${escMan} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
            break;
          }
          case 'quantity':
          case 'stock.quantity': {
            const escQty = parseInt(val, 10) || 0;
            mStatements.push(`UPDATE \`${dbPrefix}stock_available\` SET quantity = ${escQty} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
            break;
          }
          default: {
            const escStr = String(val).replace(/'/g, "\\'");
            mStatements.push(`UPDATE \`${dbPrefix}product\` SET \`${field}\` = '${escStr}' WHERE id_product IN (${escapedIds});`);
            break;
          }
        }
      });
      if (mStatements.length > 0) {
        mutationSql = mStatements.join('\n');
      }
    }

    // Reconstruct Rollback Reversion SQL statements from captured baseline values
    if (revertData && revertData.products && Object.keys(revertData.products).length > 0) {
      const rStatements: string[] = [];
      Object.keys(revertData.products).forEach((idProduct) => {
        const productBaseline = revertData.products[idProduct];
        if (productBaseline) {
          Object.keys(productBaseline).forEach((field) => {
            const origVal = productBaseline[field];
            if (field === 'price') {
              const escFloat = parseFloat(origVal) || 0;
              rStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET price = ${escFloat} WHERE id_product = ${idProduct} AND id_shop = ${idShop};`);
              rStatements.push(`UPDATE \`${dbPrefix}product\` SET price = ${escFloat} WHERE id_product = ${idProduct};`);
            } else if (field === 'active' || field === 'on_sale') {
              const escInt = parseInt(origVal, 10) ? 1 : 0;
              rStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET ${field} = ${escInt} WHERE id_product = ${idProduct} AND id_shop = ${idShop};`);
              rStatements.push(`UPDATE \`${dbPrefix}product\` SET ${field} = ${escInt} WHERE id_product = ${idProduct};`);
            } else {
              const escStr = String(origVal).replace(/'/g, "\\'");
              rStatements.push(`UPDATE \`${dbPrefix}product\` SET \`${field}\` = '${escStr}' WHERE id_product = ${idProduct};`);
            }
          });
        }
      });
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
