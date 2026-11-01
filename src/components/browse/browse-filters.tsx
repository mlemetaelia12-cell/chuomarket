import { getTranslations } from 'next-intl/server';

type Props = {
  search: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
};

const fieldClass =
  'min-w-0 w-full rounded-xl border border-divider bg-canvas px-3 py-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-600/10';

export async function BrowseFilters({ search, category, minPrice, maxPrice, sort }: Props) {
  const t = await getTranslations('Browse');
  const categories = ['books', 'electronics', 'clothes', 'utensils', 'other'];

  return (
    <form
      action=""
      className="grid gap-2 rounded-2xl border border-divider bg-white p-3 shadow-card sm:grid-cols-2 lg:grid-cols-5"
    >
      <input
        aria-label={t('searchPlaceholder')}
        className={fieldClass}
        defaultValue={search}
        name="q"
        placeholder={t('searchPlaceholder')}
      />
      <select
        aria-label={t('allCategories')}
        className={fieldClass}
        defaultValue={category}
        name="category"
      >
        <option value="">{t('allCategories')}</option>
        {categories.map((key) => (
          <option key={key} value={key}>
            {t(`categories.${key}`)}
          </option>
        ))}
      </select>
      <input
        aria-label={t('minPrice')}
        className={fieldClass}
        defaultValue={minPrice}
        min="0"
        name="min"
        placeholder={t('minPrice')}
        type="number"
      />
      <input
        aria-label={t('maxPrice')}
        className={fieldClass}
        defaultValue={maxPrice}
        min="0"
        name="max"
        placeholder={t('maxPrice')}
        type="number"
      />
      <div className="flex gap-2">
        <select
          aria-label={t('sortBy')}
          className={`${fieldClass} flex-1`}
          defaultValue={sort}
          name="sort"
        >
          <option value="newest">{t('newest')}</option>
          <option value="price_asc">{t('priceLowHigh')}</option>
          <option value="price_desc">{t('priceHighLow')}</option>
        </select>
        <button
          className="min-h-11 shrink-0 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white transition hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          type="submit"
        >
          {t('filter')}
        </button>
      </div>
    </form>
  );
}
