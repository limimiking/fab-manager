// TODO: Remove next eslint-disable
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useImmer } from 'use-immer';
import { useTranslation } from 'react-i18next';
import { react2angular } from 'react2angular';
import { Loader } from '../base/loader';
import { IApplication } from '../../models/application';
import { Product } from '../../models/product';
import { ProductCategory } from '../../models/product-category';
import { FabButton } from '../base/fab-button';
import { ProductsList } from './products-list';
import ProductAPI from '../../api/product';
import ProductCategoryAPI from '../../api/product-category';
import MachineAPI from '../../api/machine';
import { CaretDown, X } from 'phosphor-react';
import Switch from 'react-switch';
import Select from 'react-select';

declare const Application: IApplication;

interface ProductsProps {
  onSuccess: (message: string) => void,
  onError: (message: string) => void,
}
/**
 * Option format, expected by react-select
 * @see https://github.com/JedWatson/react-select
 */
 type selectOption = { value: number, label: string };

/**
 * This component shows all Products and filter
 */
const Products: React.FC<ProductsProps> = ({ onSuccess, onError }) => {
  const { t } = useTranslation('admin');

  const [products, setProducts] = useState<Array<Product>>([]);
  const [filteredProductsList, setFilteredProductList] = useImmer<Array<Product>>([]);
  const [features, setFeatures] = useImmer<Filters>(initFilters);
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [filters, setFilters] = useImmer<Filters>(initFilters);
  const [sortOption, setSortOption] = useState<number>(0);
  const [clearFilters, setClearFilters] = useState<boolean>(false);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [machines, setMachines] = useState<checklistOption[]>([]);
  const [update, setUpdate] = useState(false);

  useEffect(() => {
    ProductAPI.index().then(data => {
      setProducts(data);
      setFilteredProductList(data);
    });
  }, []);

  useEffect(() => {
    ProductCategoryAPI.index().then(data => {
      // Map product categories by position
      const sortedCategories = data
        .filter(c => !c.parent_id)
        .sort((a, b) => a.position - b.position);
      const childrenCategories = data
        .filter(c => typeof c.parent_id === 'number')
        .sort((a, b) => b.position - a.position);
      childrenCategories.forEach(c => {
        const parentIndex = sortedCategories.findIndex(i => i.id === c.parent_id);
        sortedCategories.splice(parentIndex + 1, 0, c);
      });
      setProductCategories(sortedCategories);
    }).catch(onError);
    MachineAPI.index({ disabled: false }).then(data => {
      setMachines(buildChecklistOptions(data));
    }).catch(onError);
  }, []);

  useEffect(() => {
    applyFilters();
    setClearFilters(false);
    setUpdate(false);
  }, [filterVisible, clearFilters, update === true]);

  /**
   * Goto edit product page
   */
  const editProduct = (product: Product) => {
    window.location.href = `/#!/admin/store/products/${product.id}/edit`;
  };

  /**
   * Delete a product
   */
  const deleteProduct = async (productId: number): Promise<void> => {
    try {
      await ProductAPI.destroy(productId);
      const data = await ProductAPI.index();
      setProducts(data);
      onSuccess(t('app.admin.store.products.successfully_deleted'));
    } catch (e) {
      onError(t('app.admin.store.products.unable_to_delete') + e);
    }
  };

  /**
   * Goto new product page
   */
  const newProduct = (): void => {
    window.location.href = '/#!/admin/store/products/new';
  };

  /**
   * Filter: toggle hidden products visibility
   */
  const toggleVisible = (checked: boolean) => {
    setFilterVisible(checked);
  };

  /**
   * Filter: by categories
   */
  const handleSelectCategory = (c: ProductCategory, checked, instantUpdate?) => {
    let list = [...filters.categories];
    const children = productCategories
      .filter(el => el.parent_id === c.id);
    const siblings = productCategories
      .filter(el => el.parent_id === c.parent_id && el.parent_id !== null);

    if (checked) {
      list.push(c);
      if (children.length) {
        const unique = Array.from(new Set([...list, ...children]));
        list = [...unique];
      }
      if (siblings.length && siblings.every(el => list.includes(el))) {
        list.push(productCategories.find(p => p.id === siblings[0].parent_id));
      }
    } else {
      list.splice(list.indexOf(c), 1);
      const parent = productCategories.find(p => p.id === c.parent_id);
      if (c.parent_id && list.includes(parent)) {
        list.splice(list.indexOf(parent), 1);
      }
      if (children.length) {
        children.forEach(child => {
          list.splice(list.indexOf(child), 1);
        });
      }
    }
    setFilters(draft => {
      return { ...draft, categories: list };
    });
    if (instantUpdate) {
      setUpdate(true);
    }
  };

  /**
   * Filter: by machines
   */
  const handleSelectMachine = (m: checklistOption, checked, instantUpdate?) => {
    const list = [...filters.machines];
    checked
      ? list.push(m)
      : list.splice(list.indexOf(m), 1);
    setFilters(draft => {
      return { ...draft, machines: list };
    });
    if (instantUpdate) {
      setUpdate(true);
    }
  };

  /**
   * Display option: sorting
   */
  const handleSorting = (value: number) => {
    setSortOption(value);
    setUpdate(true);
  };

  /**
   * Apply filters
   */
  const applyFilters = () => {
    let updatedList = [...products];
    let tags = initFilters;
    if (filterVisible) {
      updatedList = updatedList.filter(p => p.is_active);
    }

    if (filters.categories.length) {
      updatedList = updatedList.filter(p => filters.categories
        .map(fc => fc.id)
        .includes(p.product_category_id));
    }
    tags = { ...tags, categories: [...filters.categories] };

    if (filters.machines.length) {
      updatedList = updatedList.filter(p => {
        return p.machine_ids.find(pmId => filters.machines
          .map(fmId => fmId.value)
          .includes(pmId));
      });
    }
    tags = { ...tags, machines: [...filters.machines] };

    if (sortOption >= 0) {
      updatedList = sortProductsList(updatedList, sortOption);
    }

    setFeatures(tags);
    setFilteredProductList(updatedList);
  };

  /**
   * Clear filters
   */
  const clearAllFilters = () => {
    setFilters(initFilters);
    setClearFilters(true);
  };

  /**
   * Creates sorting options to the react-select format
   */
  const buildOptions = (): Array<selectOption> => {
    return [
      { value: 0, label: t('app.admin.store.products.sort.name_az') },
      { value: 1, label: t('app.admin.store.products.sort.name_za') }
      //  { value: 2, label: t('app.admin.store.products.sort.price_low') },
      //  { value: 3, label: t('app.admin.store.products.sort.price_high') }
    ];
  };
  /**
   * Sorts products list
   */
  const sortProductsList = (list: Product[], option: number): Product[] => {
    switch (option) {
      case 0:
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 1:
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case 2:
        return list.sort((a, b) => a.amount - b.amount);
      case 3:
        return list.sort((a, b) => b.amount - a.amount);
    }
  };

  return (
    <div className='products'>
      <header>
        <h2>{t('app.admin.store.products.all_products')}</h2>
        <div className='grpBtn'>
          <FabButton className="main-action-btn" onClick={newProduct}>{t('app.admin.store.products.create_a_product')}</FabButton>
        </div>
      </header>
      <div className='layout'>
        <div className='products-filters span-3'>
          <header>
            <h3>{t('app.admin.store.products.filter')}</h3>
            <div className='grpBtn'>
              <FabButton onClick={clearAllFilters} className="is-black">{t('app.admin.store.products.filter_clear')}</FabButton>
            </div>
          </header>
          <div className='accordion'>
            <div className='accordion-item'>
              <input type="checkbox" defaultChecked />
              <header>{t('app.admin.store.products.filter_categories')}
                <CaretDown size={16} weight="bold" /></header>
              <div className='content'>
                <div className="list scrollbar">
                  {productCategories.map(pc => (
                    <label key={pc.id} className={pc.parent_id ? 'offset' : ''}>
                      <input type="checkbox" checked={filters.categories.includes(pc)} onChange={(event) => handleSelectCategory(pc, event.target.checked)} />
                      <p>{pc.name}</p>
                    </label>
                  ))}
                </div>
                <FabButton onClick={applyFilters} className="is-info">{t('app.admin.store.products.filter_apply')}</FabButton>
              </div>
            </div>

            <div className='accordion-item'>
              <input type="checkbox" defaultChecked />
              <header>{t('app.admin.store.products.filter_machines')}
                <CaretDown size={16} weight="bold" /></header>
              <div className='content'>
                <div className="list scrollbar">
                  {machines.map(m => (
                    <label key={m.value}>
                      <input type="checkbox" checked={filters.machines.includes(m)} onChange={(event) => handleSelectMachine(m, event.target.checked)} />
                      <p>{m.label}</p>
                    </label>
                  ))}
                </div>
                <FabButton onClick={applyFilters} className="is-info">{t('app.admin.store.products.filter_apply')}</FabButton>
              </div>
            </div>
          </div>
        </div>
        <div className='products-list span-7'>
          <div className='status'>
            <div className='count'>
              <p>{t('app.admin.store.products.result_count')}<span>{filteredProductsList.length}</span></p>
            </div>
            <div className="display">
              <div className='sort'>
                <p>{t('app.admin.store.products.display_options')}</p>
                <Select
                  options={buildOptions()}
                  onChange={evt => handleSorting(evt.value)}
                  value={buildOptions[sortOption]}
                  styles={customStyles}
                />
              </div>
              <div className='visibility'>
                <label>
                  <span>{t('app.admin.store.products.visible_only')}</span>
                  <Switch
                    checked={filterVisible}
                    onChange={(checked) => toggleVisible(checked)}
                    width={40}
                    height={19}
                    uncheckedIcon={false}
                    checkedIcon={false}
                    handleDiameter={15} />
                </label>
              </div>
            </div>
          </div>
          <div className='features'>
            {features.categories.map(c => (
              <div key={c.id} className='features-item'>
                <p>{c.name}</p>
                <button onClick={() => handleSelectCategory(c, false, true)}><X size={16} weight="light" /></button>
              </div>
            ))}
            {features.machines.map(m => (
              <div key={m.value} className='features-item'>
                <p>{m.label}</p>
                <button onClick={() => handleSelectMachine(m, false, true)}><X size={16} weight="light" /></button>
              </div>
            ))}
          </div>
          <ProductsList
            products={filteredProductsList}
            onEdit={editProduct}
            onDelete={deleteProduct}
          />
        </div>
      </div>
    </div>
  );
};

const ProductsWrapper: React.FC<ProductsProps> = ({ onSuccess, onError }) => {
  return (
    <Loader>
      <Products onSuccess={onSuccess} onError={onError} />
    </Loader>
  );
};

Application.Components.component('products', react2angular(ProductsWrapper, ['onSuccess', 'onError']));

/**
 * Option format, expected by checklist
 */
type checklistOption = { value: number, label: string };

/**
 * Convert the provided array of items to the checklist format
 */
const buildChecklistOptions = (items: Array<{ id?: number, name: string }>): Array<checklistOption> => {
  return items.map(t => {
    return { value: t.id, label: t.name };
  });
};

const initFilters: Filters = {
  instant: false,
  categories: [],
  machines: [],
  keywords: [],
  internalStock: {
    from: 0,
    to: null
  },
  externalStock: {
    from: 0,
    to: null
  }
};

interface Stock {
  from: number,
  to: number
}

interface Filters {
  instant: boolean,
  categories: ProductCategory[],
  machines: checklistOption[],
  keywords: string[],
  internalStock: Stock,
  externalStock: Stock
}

// Styles the React-select component
const customStyles = {
  control: base => ({
    ...base,
    width: '20ch',
    border: 'none',
    backgroundColor: 'transparent'
  }),
  indicatorSeparator: () => ({
    display: 'none'
  })
};
