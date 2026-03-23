import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Users, Ticket, MessageCircle, ArrowRight, Star } from 'lucide-react'

const features = [
  { icon: Ticket,        title: 'Book Together',     desc: 'Group bookings with split payment. Everyone gets their own ticket.' },
  { icon: Users,         title: 'Discover People',   desc: 'See who else is going. Connect before the event even starts.' },
  { icon: MessageCircle, title: 'Chat & Coordinate', desc: 'Real-time group chat. Plan meetups, share seats, make friends.' },
  { icon: Star,          title: 'Rate & Trust',       desc: 'After the event, rate your experience. Build your social reputation.' },
]

const stats = [
  { value: '50K+',  label: 'Active Users' },
  { value: '1,200', label: 'Events Listed' },
  { value: '98%',   label: 'Satisfaction' },
  { value: '4.9★',  label: 'App Rating' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-base text-text-primary overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-md bg-base/80">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="text-lg font-bold gradient-text">EventMeet</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
            <Link to="/register" className="btn-primary btn-sm">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-pink/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="badge-violet text-xs mb-6 inline-flex">
              <Zap className="w-3 h-3" /> The social layer for live events
            </span>

            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
              Go to events.{' '}
              <span className="gradient-text">Meet people.</span>{' '}
              Make memories.
            </h1>

            <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10">
              EventMeet connects you with people attending the same events.
              Book together, chat in real-time, and turn strangers into friends.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="btn-primary text-base px-8 py-3 w-full sm:w-auto">
                Start for free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/events" className="btn-secondary text-base px-8 py-3 w-full sm:w-auto">
                Browse events
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20"
          >
            {stats.map(({ value, label }) => (
              <div key={label} className="card text-center">
                <p className="text-2xl font-bold gradient-text">{value}</p>
                <p className="text-sm text-text-secondary mt-1">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to{' '}
              <span className="gradient-text">go out together</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-xl mx-auto">
              From discovery to the after-party — EventMeet handles the social side of events.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card group hover:border-violet/50 hover:shadow-glow transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-violet/15 flex items-center justify-center mb-4 group-hover:bg-violet/25 transition-colors">
                  <Icon className="w-5 h-5 text-violet-light" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="relative card text-center overflow-hidden border-violet/30">
            <div className="absolute inset-0 bg-gradient-brand opacity-5 pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl font-bold mb-4">Ready to meet your people?</h2>
              <p className="text-text-secondary mb-8">Join thousands of people who use EventMeet to make every event more social.</p>
              <Link to="/register" className="btn-primary text-base px-10 py-3">
                Create free account <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-brand flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" fill="white" />
            </div>
            <span className="text-sm font-semibold gradient-text">EventMeet</span>
          </div>
          <p className="text-xs text-text-disabled">© 2026 EventMeet. Made for the generation that goes out.</p>
        </div>
      </footer>
    </div>
  )
}
