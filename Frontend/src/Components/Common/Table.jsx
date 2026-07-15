import { ChevronLeft, ChevronRight } from "lucide-react";

const Table = ({
  columns,
  data,
  renderActions,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalRecords = data.length,
}) => {
  if (data.length === 0) {
    return (
      <div
        className={`
          overflow-hidden
          rounded-xl
          border
          border-slate-100
          bg-white
          shadow-sm
        `}
      >
        <div
          className={`
            grid
            place-items-center
            p-6
            text-center
            text-sm
            text-slate-400
          `}
        >
          No records found
        </div>
      </div>
    );
  }

  // Calculate standard showing values (e.g. 1 to 10 of 25)
  const fromRecord = totalRecords > 0 ? (currentPage - 1) * 10 + 1 : 0;
  const toRecord = Math.min(currentPage * 10, totalRecords);

  return (
    <div
      className={`
        overflow-hidden
        rounded-xl
        border
        border-slate-100
        bg-white
        shadow-sm
      `}
    >
      <div className="max-h-[520px] overflow-auto">
        <table
          className={`
            w-full
            min-w-[720px]
            border-collapse
          `}
        >
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    sticky
                    top-0
                    z-10
                    px-5
                    py-3
                    text-left
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-slate-400
                    border-b
                    border-slate-100
                    bg-slate-50/95
                    backdrop-blur
                  `}
                >
                  {column.label}
                </th>
              ))}

              {renderActions && (
                <th
                  className={`
                    sticky
                    top-0
                    z-10
                    px-5
                    py-3
                    text-left
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-slate-400
                    border-b
                    border-slate-100
                    bg-slate-50/95
                    backdrop-blur
                  `}
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {data.map((item) => (
              <tr
                key={item.id}
                className={`
                  border-b
                  border-slate-100/80
                  hover:bg-slate-50/50
                  transition-colors
                  duration-150
                `}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`
                      px-5
                      py-3
                      text-sm
                      text-slate-600
                    `}
                  >
                    {item[column.key]}
                  </td>
                ))}

                {renderActions && (
                  <td
                    className={`
                      px-5
                      py-3
                      text-sm
                      text-slate-600
                    `}
                  >
                    {renderActions(item)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modern Operational Pagination Footer */}
      <div
        className={`
          flex
          items-center
          justify-between
          px-5
          py-3
          border-t
          border-slate-100
          bg-white
        `}
      >
        <span
          className={`
            text-xs
            text-slate-500
          `}
        >
          {onPageChange 
            ? `Showing ${fromRecord} to ${toRecord} of ${totalRecords} records`
            : `Showing 1 to ${data.length} of ${data.length} records`}
        </span>
        <div className="flex items-center gap-1">
          {onPageChange ? (
            <>
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`
                  p-1
                  rounded-md
                  border
                  border-slate-200
                  text-slate-400
                  hover:bg-slate-50
                  disabled:opacity-50
                  disabled:hover:bg-transparent
                  transition-all
                  cursor-pointer
                `}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, idx) => {
                const pageNum = idx + 1;
                const isCurrent = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`
                      w-7
                      h-7
                      rounded-md
                      text-xs
                      font-bold
                      flex
                      items-center
                      justify-center
                      shadow-sm
                      cursor-pointer
                      transition-all
                      ${isCurrent ? "text-white bg-orange-500" : "text-slate-600 hover:bg-slate-50"}
                    `}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`
                  p-1
                  rounded-md
                  border
                  border-slate-200
                  text-slate-400
                  hover:bg-slate-50
                  disabled:opacity-50
                  disabled:hover:bg-transparent
                  transition-all
                  cursor-pointer
                `}
              >
                <ChevronRight size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                className={`
                  p-1
                  rounded-md
                  border
                  border-slate-200
                  text-slate-400
                  hover:bg-slate-50
                  transition-all
                `}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                className={`
                  w-7
                  h-7
                  rounded-md
                  text-xs
                  font-bold
                  text-white
                  bg-orange-500
                  flex
                  items-center
                  justify-center
                  shadow-sm
                `}
              >
                1
              </button>
              <button
                className={`
                  w-7
                  h-7
                  rounded-md
                  text-xs
                  font-bold
                  text-slate-600
                  hover:bg-slate-50
                  flex
                  items-center
                  justify-center
                  transition-all
                `}
              >
                2
              </button>
              <button
                className={`
                  w-7
                  h-7
                  rounded-md
                  text-xs
                  font-bold
                  text-slate-600
                  hover:bg-slate-50
                  flex
                  items-center
                  justify-center
                  transition-all
                `}
              >
                3
              </button>
              <span className="text-xs text-slate-400 px-1">...</span>
              <button
                className={`
                  w-7
                  h-7
                  rounded-md
                  text-xs
                  font-bold
                  text-slate-600
                  hover:bg-slate-50
                  flex
                  items-center
                  justify-center
                  transition-all
                `}
              >
                26
              </button>
              <button
                className={`
                  p-1
                  rounded-md
                  border
                  border-slate-200
                  text-slate-400
                  hover:bg-slate-50
                  transition-all
                `}
              >
                <ChevronRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Table;
