# Design Guidelines: Prime Number Calculator

## Design Approach
**System-Based Approach**: Material Design-inspired utility application focusing on clarity, functionality, and immediate usability. This is a single-purpose mathematical tool prioritizing calculation efficiency over visual flair.

## Layout Strategy

**Single-Screen Application**
- Centered container layout (max-w-2xl) with vertical card design
- No hero section needed - direct access to functionality
- Minimal vertical scrolling - all core elements visible on load
- Card-based design with subtle elevation for the main calculator area

**Spacing System**
Use Tailwind units: 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-8
- Element spacing: space-y-6 for vertical flow
- Input/button gaps: gap-4

## Typography

**Font Family**: Inter or Roboto from Google Fonts
- Heading (Calculator title): text-2xl, font-semibold
- Input labels: text-sm, font-medium
- Error messages: text-sm, font-normal
- Results: text-lg, font-semibold for numbers, text-base for labels

## Component Structure

**Main Container**
- Single centered card (rounded-xl with shadow)
- Background treatment: subtle gradient or solid neutral

**Input Section**
- Clear label: "輸入正整數" (text-sm, font-medium)
- Large number input field (text-lg, p-4, rounded-lg)
- Full-width input with clear visual focus states
- Submit button: "計算質數" (px-8, py-3, rounded-lg, font-medium)

**Validation Display**
- Error state: Red-tinted background alert with icon
- Error message examples: "請輸入正整數", "數值必須大於0", "請輸入有效數字"
- Display inline below input with smooth transition

**Results Section**
- Three-column grid for prime numbers (grid-cols-3, gap-4)
- Each prime in individual card with number prominently displayed
- Label above results: "大於 [輸入值] 的三個最接近質數："
- Loading state: Spinner or skeleton during calculation

**Navigation/Header**
- Minimal header with app title only
- No complex navigation needed

**Footer**
- Simple, unobtrusive information footer
- Brief usage instructions or mathematical note

## Interaction Patterns

**Input Behavior**
- Real-time validation on blur and submit
- Clear visual feedback for valid/invalid states
- Prevent non-numeric input with input type="number"
- Auto-focus on page load

**Results Display**
- Smooth fade-in animation when results appear
- Highlight the three prime numbers clearly
- Show calculation time (optional performance indicator)

**Error Handling**
- Immediate feedback on invalid input
- Persistent error display until corrected
- Clear messaging in Traditional Chinese

## Responsive Design

**Desktop (lg:)**
- Container centered with comfortable width
- Three-column prime number display

**Tablet/Mobile (base-md:)**
- Full-width container with horizontal padding
- Stack to single column for prime results
- Larger touch targets (min 44px height)

## Accessibility
- Proper label associations
- Error announcements for screen readers
- High contrast text
- Keyboard navigation support
- Focus indicators on all interactive elements

## Images
No images required for this utility application. Focus purely on functional clarity.